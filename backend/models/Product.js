const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    img: { type: String, required: true },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ធ្វើឱ្យម៉ូដែលនេះបញ្ចេញ _id ជា id ដើម្បីឱ្យត្រូវជាមួយ Frontend
productSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
