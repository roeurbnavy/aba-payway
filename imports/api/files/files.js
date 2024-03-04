import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { FilesCollection } from "meteor/ostrio:files";
import { forEach } from "lodash";
import { getFilePath } from "./path";

/* http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html */
/* See fs-extra and graceful-fs NPM packages */
/* For better i/o performance */
const { appName = "App" } = Meteor.settings.public;

const bound = Meteor.bindEnvironment((callback) => {
  return callback();
});
// Create a new S3 object
let gcs, bucket;
if (Meteor.isServer) {
  const keyJson = EJSON.parse(
    Assets.getText("cloud-storage/rabbit-pos-408701-71263b9e71a4.json")
  );
  const { Storage } = require("@google-cloud/storage");
  gcs = new Storage({
    projectId: "rabbit-pos-408701", // <-- Replace this with your project ID
    // keyFilename: "cloud-storage/rabbit-pos-408701-71263b9e71a4.json", // <-- Replace this with the path to your key.json
    credentials: keyJson,
  });

  bucket = gcs.bucket("pos_storage");
  bucket.getMetadata(function (error, metadata, apiRespone) {
    if (error) {
      console.error(error);
    }
  });
}

const Files = new FilesCollection({
  debug: false,
  storagePath: () => {
    return getFilePath();
  },
  collectionName: "app_files",
  // allowClientCode: false,
  // permissions: 777,
  // parentDirPermissions: 777,
  // Start moving files to AWS:S3
  // after fully received by the Meteor server
  onAfterUpload(fileRef) {
    forEach(fileRef.versions, (vRef, version) => {
      // We use Random.id() instead of real file's _id
      // to secure files from reverse engineering on the AWS client
      const dir = appName.trim().toLowerCase();
      const filePath = `${dir}/${Random.id()}-${version}.${fileRef.extension}`;

      // Here we set the neccesary options to upload the file, for more options, see
      // https://googlecloudplatform.github.io/gcloud-node/#/docs/v0.36.0/storage/bucket?method=upload
      const options = {
        destination: filePath,
        resumable: true,
      };

      bucket.upload(fileRef.path, options, (error) => {
        bound(() => {
          if (error) {
            console.error("Upload error :: ", error);
          } else {
            // Update FilesCollection with link to the file at AWS
            const upd = { $set: {} };
            upd["$set"]["versions." + version + ".meta.pipePath"] = filePath;

            this.collection.update(
              {
                _id: fileRef._id,
              },
              upd,
              (updError) => {
                if (updError) {
                  console.error(updError);
                } else {
                  // Unlink original files from FS after successful upload to AWS:S3
                  this.unlink(this.collection.findOne(fileRef._id), version);
                }
              }
            );
          }
        });
      });
    });
  },
  interceptDownload(http, fileRef, version) {
    let ref, ref1, ref2;
    const path =
      (ref = fileRef.versions) != null
        ? (ref1 = ref[version]) != null
          ? (ref2 = ref1.meta) != null
            ? ref2.pipePath
            : void 0
          : void 0
        : void 0;
    const vRef = ref1;
    if (path) {
      // If file is moved to Google Cloud Storage
      // We will pipe request to Google Cloud Storage
      // So, original link will stay always secure
      const remoteReadStream = getReadableStream(http, path, vRef);
      this.serve(http, fileRef, vRef, version, remoteReadStream);
      return true;
    }
    // While the file has not been uploaded to Google Cloud Storage, we will serve it from the filesystem
    return false;
  },
});

// Intercept FilesCollection's remove method to remove file from AWS:S3
const _origRemove = Files.remove;
Files.remove = function (selector, callback) {
  const cursor = this.collection.find(selector);
  cursor.forEach((fileRef) => {
    forEach(fileRef.versions, (vRef) => {
      if (vRef && vRef.meta && vRef.meta.pipePath) {
        bucket.file(vRef.meta.pipePath).delete((error) => {
          bound(() => {
            if (error) {
              console.error(error);
            }
          });
        });
      }
    });
  });

  // Remove original file from database
  _origRemove.call(this, selector, callback);
};

function getReadableStream(http, path, vRef) {
  let array,
    end,
    partial,
    remoteReadStream,
    reqRange,
    responseType,
    start,
    take;

  if (http.request.headers.range) {
    partial = true;
    array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);
    start = parseInt(array[1]);
    end = parseInt(array[2]);
    if (isNaN(end)) {
      end = vRef.size - 1;
    }
    take = end - start;
  } else {
    start = 0;
    end = vRef.size - 1;
    take = vRef.size;
  }

  if (
    partial ||
    (http.params.query.play && http.params.query.play === "true")
  ) {
    reqRange = {
      start: start,
      end: end,
    };
    if (isNaN(start) && !isNaN(end)) {
      reqRange.start = end - take;
      reqRange.end = end;
    }
    if (!isNaN(start) && isNaN(end)) {
      reqRange.start = start;
      reqRange.end = start + take;
    }
    if (start + take >= vRef.size) {
      reqRange.end = vRef.size - 1;
    }
    if (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1) {
      responseType = "416";
    } else {
      responseType = "206";
    }
  } else {
    responseType = "200";
  }

  if (responseType === "206") {
    remoteReadStream = bucket.file(path).createReadStream({
      start: reqRange.start,
      end: reqRange.end,
    });
  } else if (responseType === "200") {
    remoteReadStream = bucket.file(path).createReadStream();
  }

  return remoteReadStream;
}

export default Files;
