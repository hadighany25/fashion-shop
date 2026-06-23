const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: String, required: true },
    itemsString: { type: String },
    cartItems: { type: String }, // ថែមថ្មី៖ ទុកទិន្នន័យកន្ត្រកបណ្តោះអាសន្ន
    amount: { type: Number },
    date: { type: String },
    status: { type: String, default: "PENDING" }, // ដូរលំនាំដើមទៅ PENDING
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
