import { Meteor } from 'meteor/meteor'
import { Random } from 'meteor/random'
import { FilesCollection } from 'meteor/ostrio:files'
import { forEach } from 'lodash'
import { getFilePath } from './path'
import {S3} from 'aws-sdk'
/* http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html */
/* See fs-extra and graceful-fs NPM packages */
/* For better i/o performance */
import fs from 'fs'

const { appName = 'App' } = Meteor.settings.public
const s3Conf = Meteor.settings.s3|| {}
const bound = Meteor.bindEnvironment((callback) => {
  return callback()
})

// Create a new S3 object
const s3 = new S3({
  secretAccessKey: s3Conf.secret,
  accessKeyId: s3Conf.key,
  region: s3Conf.region,
  // sslEnabled: true, // optional
  httpOptions: {
    timeout: 6000,
    agent: false,
  },
})

const Files = new FilesCollection({
  storagePath: () => {
    return getFilePath()
  },
  collectionName: 'app_files',
  // permissions: 777,
  // parentDirPermissions: 777,
  // Start moving files to AWS:S3
  // after fully received by the Meteor server
  onAfterUpload(fileRef) {
    forEach(fileRef.versions, (vRef, version) => {
      // We use Random.id() instead of real file's _id
      // to secure files from reverse engineering on the AWS client
      const dir = appName.trim().toLowerCase()
      const filePath =`
        ${dir}/'${Random.id}-${version}.${fileRef.extension}`

      // Create the AWS:S3 object.
      // Feel free to change the storage class from, see the documentation,
      // `STANDARD_IA` is the best deal for low access files.
      // Key is the file name we are creating on AWS:S3, so it will be like files/XXXXXXXXXXXXXXXXX-original.XXXX
      // Body is the file stream we are sending to AWS
      s3.putObject(
        {
          // ServerSideEncryption: 'AES256', // Optional
          StorageClass: 'STANDARD',
          Bucket: s3Conf.bucket,
          Key: filePath,
          Body: fs.createReadStream(vRef.path),
          ContentType: vRef.type,
        },
        (error) => {
          bound(() => {
            if (error) {
              console.error(error)
            } else {
              // Update FilesCollection with link to the file at AWS
              const upd = { $set: {} }
              upd['$set']['versions.' + version + '.meta.pipePath'] = filePath

              this.collection.update(
                {
                  _id: fileRef._id,
                },
                upd,
                (updError) => {
                  if (updError) {
                    console.error(updError)
                  } else {
                    // Unlink original files from FS after successful upload to AWS:S3
                    this.unlink(this.collection.findOne(fileRef._id), version)
                  }
                }
              )
            }
          })
        }
      )
    })
  },
})

// Intercept FilesCollection's remove method to remove file from AWS:S3
const _origRemove = Files.remove
Files.remove = function (selector, callback) {
  const cursor = this.collection.find(selector)
  cursor.forEach((fileRef) => {
    forEach(fileRef.versions, (vRef) => {
      if (vRef && vRef.meta && vRef.meta.pipePath) {
        // Remove the object from AWS:S3 first, then we will call the original FilesCollection remove
        s3.deleteObject(
          {
            Bucket: s3Conf.bucket,
            Key: vRef.meta.pipePath,
          },
          (error) => {
            bound(() => {
              if (error) {
                console.error(error)
              }
            })
          }
        )
      }
    })
  })

  // Remove original file from database
  _origRemove.call(this, selector, callback)
}

export default Files
