import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";

const router = express.Router();
const allowedFields = [
  "slug",
  "name",
  "description",
  "price",
  "category",
  "stock",
  "imageUrl",
  "imageAlt",
];

function getProductInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.includes(key))
  );
}

function respondWithDatabaseError(res, error) {
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ msg: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ msg: "A product with those details already exists" });
  }
  console.error(error);
  return res.status(500).json({ msg: "Internal server error" });
}

router.post("/products", requireAuth, requireAdmin, async (req, res) => {
  try {
    const input = getProductInput(req.body);
    if (typeof input?.name !== "string" || !input.name.trim()) {
      return res.status(400).json({ msg: "Product name is required" });
    }
    const product = await Product.create(input);
    return res.status(201).json({ msg: "Product created successfully", product });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    return res.status(200).json({ products });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    return res.status(200).json({ product });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

router.put("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const input = getProductInput(req.body);
    if (!input || Object.keys(input).length === 0) {
      return res.status(400).json({ msg: "Provide at least one product field to update" });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, input, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    return res.status(200).json({ msg: "Product updated successfully", product });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

router.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    await User.updateMany(
      { "cart.product": product._id },
      { $pull: { cart: { product: product._id } } }
    );
    return res.status(200).json({ msg: "Product deleted successfully" });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

export default router;
