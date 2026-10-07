import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Store from "../models/Store.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";

const router = express.Router();
const PAGE_SIZE = 5;
const allowedFields = [
  "slug",
  "name",
  "description",
  "price",
  "category",
  "stock",
  "imageUrl",
  "imageAlt",
  "promotionLabel",
  "promotionColor",
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
    const activeStores = await Store.find({ status: "approved" }).select("_id").lean();
    const products = await Product.find({
      $or: [
        { store: null },
        { store: { $exists: false } },
        { store: { $in: activeStores.map((store) => store._id) } },
      ],
    }).populate("store", "name slug").sort({ createdAt: -1 });
    return res.status(200).json({ products });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

router.get("/admin/products", requireAuth, requireAdmin, async (req, res) => {
  const requestedPage = Number.parseInt(req.query.page, 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const filter = {
    store: null,
    ...(search
      ? { $or: ["name", "category", "slug"].map((field) => ({
        [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
      })) }
      : {}),
  };
  try {
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage = totalPages ? Math.min(page, totalPages) : 1;
    const products = await Product.find(filter)
      .populate("store", "name slug")
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();
    return res.status(200).json({
      products,
      pagination: { page: safePage, pageSize: PAGE_SIZE, total, totalPages },
    });
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
    if (product.store) {
      const store = await Store.findOne({ _id: product.store, status: "approved" }).select("_id");
      if (!store) return res.status(404).json({ msg: "Product not found" });
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
    const product = await Product.findOneAndUpdate({ _id: req.params.id, store: null }, input, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ msg: "Main-market product not found" });
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
    const session = await mongoose.startSession();
    let product;
    try {
      await session.withTransaction(async () => {
        product = await Product.findOneAndDelete(
          { _id: req.params.id, store: null },
          { session }
        );
        if (product) {
          await User.updateMany(
            { "cart.product": product._id },
            { $pull: { cart: { product: product._id } } },
            { session }
          );
        }
      });
    } finally {
      await session.endSession();
    }
    if (!product) return res.status(404).json({ msg: "Main-market product not found" });
    return res.status(200).json({ msg: "Product deleted successfully" });
  } catch (error) {
    return respondWithDatabaseError(res, error);
  }
});

export default router;
