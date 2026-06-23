const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // រក្សា id ជាលេខដើម្បីកុំឱ្យ Error Frontend
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  img: { type: String, required: true },
  stock: { type: Number, default: 0 },
});

module.exports = mongoose.model("Product", productSchema);
