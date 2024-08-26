import { Meteor } from "meteor/meteor";
import Base64 from "crypto-js/enc-base64";
import { HmacSHA512 } from "crypto-js";
Meteor.methods({
  abaPayway(total) {
    if (Meteor.isServer) {
      console.log("total", total);
      // Define constants
      const ABA_PAYWAY_API_URL =
        "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase";
      const ABA_PAYWAY_MERCHANT_ID = "ec438088";
      // Handle form submission
      console.log("called");
      const items = Buffer.from(
        JSON.stringify([
          { name: "test1", quantity: "1", price: "10.00" },
          { name: "test2", quantity: "1", price: "10.00" },
        ])
      ).toString("base64");
      const req_time = Math.floor(Date.now() / 1000);
      const transactionId = req_time;
      const amount = total;
      const firstName = "Makara";
      const lastName = "Prom";
      const phone = "015590085";
      const email = "roeurbnaby@gmail.com";
      const return_params = "Hello World!";
      const type = "purchase";
      const currency = "USD";
      const payment_option = "abapay";
      const shipping = "1.35";

      const generate =
        req_time +
        ABA_PAYWAY_MERCHANT_ID +
        transactionId +
        amount +
        items +
        shipping +
        firstName +
        lastName +
        email +
        phone +
        type +
        payment_option +
        currency +
        return_params;
      const hash = getHash(generate);

      console.log("hash", hash);

      return {
        ABA_PAYWAY_API_URL,
        hash,
        transactionId,
        amount,
        firstName,
        lastName,
        phone,
        email,
        items,
        return_params,
        shipping,
        currency,
        type,
        payment_option,
        ABA_PAYWAY_MERCHANT_ID,
        req_time,
      };
    }
  },
});

// Function to generate HMAC hash
function getHash(str) {
  const ABA_PAYWAY_API_KEY = "965dd4e87cce272badd4a346181ce5d815da2ab3";
  const hmac = HmacSHA512(str, ABA_PAYWAY_API_KEY);
  return Base64.stringify(hmac);
  // const hmac = createHmac("sha512", ABA_PAYWAY_API_KEY)
  //   .update(str)
  //   .digest("base64");
  // return hmac;
}
