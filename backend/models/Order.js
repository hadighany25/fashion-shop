const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: String, default: "Unknown" },
  itemsString: { type: String },
  amount: { type: Number },
  date: { type: String },
  status: { type: String, default: "PENDING" },
  cart: { type: Array },
});

module.exports = mongoose.model("Order", orderSchema);
