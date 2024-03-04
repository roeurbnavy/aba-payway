import { Meteor } from "meteor/meteor";

// // Collections
import Files from "./files";
Meteor.methods({
  findImageData: () => {
    if (Meteor.isServer) {
      try {
        let images = Files.find(
          {},
          {
            sort: { date: -1 },
          }
        ).fetch();

        const url = Meteor.absoluteUrl();
        images.forEach((o) => {
          // o.url = Files.findOne({ _id: o._id }).link();
          const fileRef = Files.collection.findOne({ _id: o._id });
          o.url = Files.link(fileRef, "original", url);
        });

        return images;
      } catch (error) {
        console.log("error", error);
      }
    }
  },
  findImage: ({ _id }) => {
    if (Meteor.isServer) {
      let images = Files.find({ _id }).fetch();

      if (images.length) {
        let image = images[0];

        // Get image url
        image.url = Files.findOne({ _id: image._id }).url();

        return image;
      }

      return null;
    }
  },
});
