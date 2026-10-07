import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: "General", trim: true },
    stock: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, trim: true, default: "" },
    imageAlt: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
