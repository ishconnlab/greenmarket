import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";

const router = express.Router();
const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
router.use("/orders", requireAuth);

async function releaseStock(items) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantity } }
    );
  }
}

router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/admin/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Could not load orders" });
  }
});

router.patch("/admin/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: "Invalid order id" });
    }
    const { status, paymentStatus } = req.body || {};
    if (
      (status !== undefined && !orderStatuses.includes(status)) ||
      (paymentStatus !== undefined && !["awaiting_confirmation", "paid"].includes(paymentStatus)) ||
      (status === undefined && paymentStatus === undefined)
    ) {
      return res.status(400).json({ msg: "Choose a valid order status or payment status" });
    }

    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({ msg: "Order not found" });
    }
    if (status === "cancelled" && currentOrder.status !== "cancelled") {
      const order = await Order.findOneAndUpdate(
        { _id: currentOrder._id, status: currentOrder.status },
        { $set: { status: "cancelled", ...(paymentStatus ? { paymentStatus } : {}) } },
        { returnDocument: "after" }
      );
      if (!order) {
        return res.status(409).json({ msg: "Order status changed. Refresh and try again." });
      }
      try {
        await releaseStock(order.items.map((item) => ({
          productId: item.product,
          quantity: item.quantity,
        })));
      } catch (error) {
        console.error("Order cancelled but stock restoration failed:", error);
        return res.status(500).json({
          msg: "Order was cancelled, but stock restoration failed. Please check inventory.",
        });
      }
      return res.status(200).json({ msg: "Order updated", order });
    }
    if (currentOrder.status === "cancelled" && status && status !== "cancelled") {
      return res.status(409).json({ msg: "Cancelled orders cannot be reopened" });
    }

    const update = {};
    if (status !== undefined) update.status = status;
    if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;
    const order = await Order.findOneAndUpdate(
      { _id: currentOrder._id, status: currentOrder.status },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!order) {
      return res.status(409).json({ msg: "Order changed. Refresh and try again." });
    }
    return res.status(200).json({ msg: "Order updated", order });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Could not update order status" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const address = req.body?.address;
    const paymentMethod = req.body?.paymentMethod;
    if (typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ msg: "Delivery address is required" });
    }
    if (!["momo", "airtel_money"].includes(paymentMethod)) {
      return res.status(400).json({ msg: "Choose MTN MoMo or Airtel Money" });
    }

    const user = await User.findById(req.user.id).populate("cart.product");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    if (!user.cart.length) {
      return res.status(400).json({ msg: "Your cart is empty" });
    }

    for (const item of user.cart) {
      if (!item.product || item.quantity > item.product.stock) {
        return res.status(409).json({ msg: "A cart item is no longer available in that quantity" });
      }
    }

    const items = user.cart.map((item) => ({
      product: item.product._id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const reservedStock = [];
    for (const item of user.cart) {
      const reservation = await Product.updateOne(
        { _id: item.product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (reservation.modifiedCount !== 1) {
        await releaseStock(reservedStock);
        return res.status(409).json({ msg: "A cart item is no longer available in that quantity" });
      }
      reservedStock.push({ productId: item.product._id, quantity: item.quantity });
    }

    let order;
    try {
      order = await Order.create({
        user: user.id,
        items,
        total,
        address: address.trim(),
        paymentMethod,
      });
      user.cart = [];
      await user.save();
    } catch (error) {
      if (order) {
        await Order.deleteOne({ _id: order._id });
      }
      await releaseStock(reservedStock);
      throw error;
    }

    return res.status(201).json({ msg: "Order placed successfully", order });
  } catch (error) {
    console.error(error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ msg: "Invalid order details" });
    }
    return res.status(500).json({ msg: "Internal server error" });
  }
});

export default router;
