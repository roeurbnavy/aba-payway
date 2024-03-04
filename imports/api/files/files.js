import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { FilesCollection } from "meteor/ostrio:files";
import { forEach } from "lodash";
import { getFilePath } from "./path";

// https://github.com/veliovgroup/Meteor-Files/blob/master/docs/google-cloud-storage-integration.md
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
            // Update FilesCollection with link to the file at google cloud storage
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
                  // Unlink original files from FS after successful upload to google cloud storage
                  this.unlink(this.collection.findOne(fileRef._id), version);
                }
              }
            );
          }
        });
      });
    });
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

export default Files;
