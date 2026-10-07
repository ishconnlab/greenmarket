import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";

const router = express.Router();
router.use("/cart", requireAuth);

router.get("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("cart.product");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    return res.status(200).json({ cart: user.cart });
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
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ msg: "Quantity must be a positive whole number" });
    }

    const [user, product] = await Promise.all([
      User.findById(req.user.id),
      Product.findById(req.params.productId),
    ]);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
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

    const updatedUser = await User.findById(user.id).populate("cart.product");
    return res.status(200).json({ cart: updatedUser.cart });
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
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ msg: "Quantity must be a positive whole number" });
    }

    const product = await Product.findById(req.params.productId);
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
    if (quantity > product.stock) {
      return res.status(409).json({ msg: "Not enough stock available" });
    }

    item.quantity = quantity;
    await user.save();
    const updatedUser = await User.findById(user.id).populate("cart.product");
    return res.status(200).json({ cart: updatedUser.cart });
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
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { cart: { product: req.params.productId } } },
      { new: true }
    ).populate("cart.product");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    return res.status(200).json({ cart: user.cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

export default router;
