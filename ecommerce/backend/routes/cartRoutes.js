import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";
import Store from "../models/Store.js";

const router = express.Router();
router.use("/cart", requireAuth);

async function resolveStoreScope(value) {
  if (!value) return { storeId: null };
  if (!mongoose.isValidObjectId(value)) return { error: "Invalid store id" };
  const store = await Store.findOne({ _id: value, status: "approved" }).select("_id").lean();
  if (!store) return { error: "Store is unavailable" };
  return { storeId: store._id };
}

function matchesStore(product, storeId) {
  const productStoreId = product?.store?._id || product?.store || null;
  return storeId
    ? productStoreId?.toString() === storeId.toString()
    : !productStoreId;
}

router.get("/cart", async (req, res) => {
  try {
    const scope = await resolveStoreScope(req.query.storeId);
    if (scope.error) return res.status(400).json({ msg: scope.error });
    const user = await User.findById(req.user.id).populate({
      path: "cart.product",
      populate: { path: "store", select: "name slug" },
    });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const validItems = user.cart.filter((item) => item.product);
    if (validItems.length !== user.cart.length) {
      user.cart = validItems;
      await user.save();
    }
    const cart = user.cart.filter((item) => matchesStore(item.product, scope.storeId));
    return res.status(200).json({ cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.post("/cart/:productId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const quantity = Number(req.body?.quantity ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ msg: "Quantity must be a positive whole number" });
    }
    const scope = await resolveStoreScope(req.query.storeId);
    if (scope.error) return res.status(400).json({ msg: scope.error });

    const [user, product] = await Promise.all([
      User.findById(req.user.id),
      Product.findById(req.params.productId).populate("store", "name slug"),
    ]);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }
    if (!matchesStore(product, scope.storeId)) {
      return res.status(409).json({ msg: "This product belongs to another store" });
    }
    if (product.stock < quantity) {
      return res.status(409).json({ msg: "Not enough stock available" });
    }

    const cartItem = user.cart.find(
      (item) => item.product.toString() === product.id
    );
    if (cartItem) {
      if (cartItem.quantity + quantity > product.stock) {
        return res.status(409).json({ msg: "Not enough stock available" });
      }
      cartItem.quantity += quantity;
    } else {
      user.cart.push({ product: product.id, quantity });
    }
    await user.save();

    const updatedUser = await User.findById(user.id).populate({
      path: "cart.product",
      populate: { path: "store", select: "name slug" },
    });
    return res.status(200).json({
      cart: updatedUser.cart.filter((item) => matchesStore(item.product, scope.storeId)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.patch("/cart/:productId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const quantity = Number(req.body?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ msg: "Quantity must be a positive whole number" });
    }
    const scope = await resolveStoreScope(req.query.storeId);
    if (scope.error) return res.status(400).json({ msg: scope.error });

    const product = await Product.findById(req.params.productId).populate("store", "name slug");
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const item = user.cart.find(
      (cartItem) => cartItem.product.toString() === req.params.productId
    );
    if (!item || !product) {
      return res.status(404).json({ msg: "Cart item not found" });
    }
    if (!matchesStore(product, scope.storeId)) {
      return res.status(409).json({ msg: "This product belongs to another store" });
    }
    if (quantity > product.stock) {
      return res.status(409).json({ msg: "Not enough stock available" });
    }

    item.quantity = quantity;
    await user.save();
    const updatedUser = await User.findById(user.id).populate({
      path: "cart.product",
      populate: { path: "store", select: "name slug" },
    });
    return res.status(200).json({
      cart: updatedUser.cart.filter((cartItem) => matchesStore(cartItem.product, scope.storeId)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.delete("/cart/:productId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) {
      return res.status(400).json({ msg: "Invalid product id" });
    }
    const scope = await resolveStoreScope(req.query.storeId);
    if (scope.error) return res.status(400).json({ msg: scope.error });
    const product = await Product.findById(req.params.productId).populate("store", "name slug");
    if (!product || !matchesStore(product, scope.storeId)) {
      return res.status(404).json({ msg: "Cart item not found in this store" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { cart: { product: req.params.productId } } },
      { new: true }
    ).populate({
      path: "cart.product",
      populate: { path: "store", select: "name slug" },
    });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    return res.status(200).json({
      cart: user.cart.filter((item) => matchesStore(item.product, scope.storeId)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

export default router;
