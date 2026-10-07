import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";

const router = express.Router();
const editableFields = [
  "name",
  "slug",
  "description",
  "category",
  "phone",
  "contactEmail",
  "address",
  "logoUrl",
  "bannerUrl",
];
const reservedSlugs = new Set(["admin", "api", "store", "stores", "share", "orders", "profile", "help", "guide"]);

function cleanInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = Object.fromEntries(
    Object.entries(body).filter(([key]) => editableFields.includes(key))
  );
  for (const field of ["name", "slug", "description"]) {
    if (!partial && (typeof input[field] !== "string" || !input[field].trim())) return null;
  }
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") return null;
    input[key] = value.trim();
  }
  if (input.slug) {
    input.slug = input.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!input.slug || input.slug.length > 60 || reservedSlugs.has(input.slug)) return null;
  }
  if (input.name?.length > 100 || input.description?.length > 1200) return null;
  if (input.category?.length > 80 || input.phone?.length > 32 || input.address?.length > 240) return null;
  if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) return null;
  for (const field of ["logoUrl", "bannerUrl"]) {
    if (!input[field]) continue;
    try {
      const url = new URL(input[field]);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
      input[field] = url.href;
    } catch {
      return null;
    }
  }
  return input;
}

function handleStoreError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({ msg: "That store address or owner already has a store" });
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ msg: error.message });
  }
  console.error(error);
  return res.status(500).json({ msg: "Could not complete store request" });
}

router.get("/stores/mine", requireAuth, async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.id }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ store });
  } catch (error) {
    return handleStoreError(res, error);
  }
});

router.post("/stores/apply", requireAuth, async (req, res) => {
  const input = cleanInput(req.body);
  if (!input) return res.status(400).json({ msg: "Provide a valid store name, address, and description" });
  try {
    const current = await Store.findOne({ owner: req.user.id }).sort({ updatedAt: -1 });
    if (current?.status === "approved" || current?.status === "paused") {
      return res.status(409).json({ msg: "You already have a store. Open its dashboard to manage it." });
    }
    if (current?.status === "pending") {
      return res.status(409).json({ msg: "Your store request is awaiting review" });
    }
    const store = current
      ? await Store.findByIdAndUpdate(
        current._id,
        { $set: { ...input, status: "pending", reviewNote: "", reviewedAt: null } },
        { new: true, runValidators: true }
      )
      : await Store.create({ ...input, owner: req.user.id });
    return res.status(201).json({
      msg: "Store application submitted for Green Market review",
      store,
    });
  } catch (error) {
    return handleStoreError(res, error);
  }
});

router.patch("/stores/mine", requireAuth, async (req, res) => {
  const input = cleanInput(req.body, { partial: true });
  if (!input || !Object.keys(input).length) {
    return res.status(400).json({ msg: "Provide valid store details to update" });
  }
  try {
    const store = await Store.findOne({ owner: req.user.id }).sort({ updatedAt: -1 });
    if (!store || ["removed"].includes(store.status)) {
      return res.status(404).json({ msg: "Store application not found" });
    }
    if (store.status === "pending" || store.status === "rejected") {
      Object.assign(store, input);
      store.status = "pending";
      store.reviewNote = "";
      store.reviewedAt = null;
      await store.save();
    } else {
      Object.assign(store, input);
      await store.save();
    }
    return res.status(200).json({ store });
  } catch (error) {
    return handleStoreError(res, error);
  }
});

router.get("/stores/:slug/products", async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug.toLowerCase(), status: "approved" })
      .select("_id")
      .lean();
    if (!store) return res.status(404).json({ msg: "Store not found" });
    const products = await Product.find({ store: store._id, stock: { $gte: 0 } }).sort({ createdAt: -1 });
    return res.status(200).json({ products });
  } catch (error) {
    console.error("Could not load store products:", error);
    return res.status(500).json({ msg: "Could not load store products" });
  }
});

router.get("/stores/:slug", async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug.toLowerCase(), status: "approved" })
      .select("name slug description category phone contactEmail address logoUrl bannerUrl")
      .lean();
    if (!store) return res.status(404).json({ msg: "Store not found" });
    return res.status(200).json({ store });
  } catch (error) {
    console.error("Could not load store:", error);
    return res.status(500).json({ msg: "Could not load store" });
  }
});

router.get("/admin/stores", requireAuth, requireAdmin, async (req, res) => {
  try {
    const stores = await Store.find()
      .populate("owner", "name email")
      .sort({ status: 1, createdAt: -1 })
      .lean();
    return res.status(200).json({ stores });
  } catch (error) {
    return handleStoreError(res, error);
  }
});

router.patch("/admin/stores/:id", requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid store id" });
  }
  const { status, reviewNote = "" } = req.body || {};
  if (!["approved", "rejected", "paused"].includes(status)
    || typeof reviewNote !== "string"
    || reviewNote.length > 1000) {
    return res.status(400).json({ msg: "Choose a valid review status and note" });
  }
  try {
    const session = await mongoose.startSession();
    let store;
    try {
      await session.withTransaction(async () => {
        store = null;
        store = await Store.findByIdAndUpdate(
          req.params.id,
          { $set: { status, reviewNote: reviewNote.trim(), reviewedAt: new Date() } },
          { new: true, runValidators: true, session }
        ).populate("owner", "name email");
        if (!store) return;
        const owner = await User.findById(store.owner._id).select("role").session(session);
        if (!owner) throw new Error("Store owner account no longer exists");
        if (owner.role !== "admin") {
          await User.updateOne(
            { _id: owner._id },
            { $set: { role: ["approved", "paused"].includes(status) ? "seller" : "customer" } },
            { session }
          );
        }
      });
    } finally {
      await session.endSession();
    }
    if (!store) return res.status(404).json({ msg: "Store not found" });
    return res.status(200).json({ store });
  } catch (error) {
    return handleStoreError(res, error);
  }
});

router.delete("/admin/stores/:id", requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid store id" });
  }
  try {
    const session = await mongoose.startSession();
    let storeExists = false;
    try {
      await session.withTransaction(async () => {
        storeExists = false;
        const store = await Store.findById(req.params.id).session(session);
        if (!store) return;
        storeExists = true;
        const productIds = await Product.distinct("_id", { store: store._id }).session(session);
        await Product.deleteMany({ store: store._id }, { session });
        if (productIds.length) {
          await User.updateMany(
            { "cart.product": { $in: productIds } },
            { $pull: { cart: { product: { $in: productIds } } } },
            { session }
          );
        }
        await Store.updateOne(
          { _id: store._id },
          { $set: { status: "removed", reviewedAt: new Date() } },
          { session }
        );
        await User.updateOne(
          { _id: store.owner, role: { $ne: "admin" } },
          { $set: { role: "customer" } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
    if (!storeExists) return res.status(404).json({ msg: "Store not found" });
    return res.status(200).json({ msg: "Store removed; historical customer orders were retained" });
  } catch (error) {
    return handleStoreError(res, error);
  }
});

export default router;
