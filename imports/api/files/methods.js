import { Meteor } from 'meteor/meteor'

// // Collections
import Files from './files'
Meteor.methods({
  findImageData: () => {
    if (Meteor.isServer) {
      let images = Files.find(
        {},
        {
          sort: { date: -1 },
        }
      ).fetch()

      images.forEach((o) => {
        o.url = Files.findOne({ _id: o._id }).link()
      })

      return images
    }
  },
  findImage: ({ _id }) => {
    if (Meteor.isServer) {
      let images = Files.find({ _id }).fetch()

      if (images.length) {
        let image = images[0]

        // Get image url
        image.url = Files.findOne({ _id: image._id }).url()

        return image
      }

      return null
    }
  },
})
