<script setup>
import { nextTick, ref } from "vue";

// Csllections
const amount = ref(0);
const form = ref({
  req_time: "",
  transactionId: "",
  amount: 0,
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  return_params: "",
  type: "",
  currency: "USD",
  payment_option: "",
  shipping: "",
});
const checkout = () => {
  if (amount.value == 0) return false;

  Meteor.call("abaPayway", amount.value, (err, res) => {
    console.log(res);
    // renderData.value = res;
    form.value = res;
    // form.value.amount = amount.value;
    nextTick(() => {
      document.getElementById("aba_merchant_request")?.submit();
    });
  });
};
</script>

<template>
  <h1 class="text-3xl font-bold my-6">ABA Payway</h1>
  <input class="border p-1 mr-1 rounded" v-model.number="amount" />
  <button
    class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-4 border border-blue-500 hover:border-transparent rounded"
    type="button"
    @click="checkout"
  >
    Checkout
  </button>

  <form
    method="POST"
    :action="form.ABA_PAYWAY_API_URL"
    id="aba_merchant_request"
  >
    <input type="hidden" name="hash" :value="form.hash" />
    <input type="hidden" name="tran_id" :value="form.transactionId" />
    <input type="hidden" name="amount" :value="form.amount" />
    <input type="hidden" name="firstname" :value="form.firstName" />
    <input type="hidden" name="lastname" :value="form.lastName" />
    <input type="hidden" name="phone" :value="form.phone" />
    <input type="hidden" name="email" :value="form.email" />
    <input type="hidden" name="items" :value="form.items" />
    <input type="hidden" name="return_params" :value="form.return_params" />
    <input type="hidden" name="shipping" :value="form.shipping" />
    <input type="hidden" name="currency" :value="form.currency" />
    <input type="hidden" name="type" :value="form.type" />
    <input type="hidden" name="payment_option" :value="form.payment_option" />

    <input
      type="hidden"
      name="merchant_id"
      :value="form.ABA_PAYWAY_MERCHANT_ID"
    />
    <input type="hidden" name="req_time" :value="form.req_time" />
  </form>
</template>
