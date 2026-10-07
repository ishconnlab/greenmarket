import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Store from "../models/Store.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";
import { notifyUser } from "../services/pushNotifications.js";
import { cancelOrderAndRestoreStock } from "../services/orderOperations.js";

const router = express.Router();
const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const statusLabels = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
router.use("/orders", requireAuth);

function notifyOrderUpdate(userId, order, changes) {
  const orderCode = order._id.toString().slice(-6).toUpperCase();
  const notification = {
    title: "Green Market order update",
    body: `Order ${orderCode} ${changes.join(" ")}`,
    url: `/orders?order=${order._id}`,
  };
  void notifyUser(userId, notification).catch((error) => {
    console.error("Could not send order update notification:", error);
  });
}

router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name")
      .populate("store", "name slug")
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
      .populate("store", "name slug")
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
      const order = await cancelOrderAndRestoreStock({
        orderId: currentOrder._id,
        expectedStatus: currentOrder.status,
        paymentStatus,
        paymentConfirmedAt: currentOrder.paymentConfirmedAt,
      });
      if (!order) {
        return res.status(409).json({ msg: "Order status changed. Refresh and try again." });
      }
      const changes = [`status changed to ${statusLabels.cancelled}.`];
      if (paymentStatus !== undefined && paymentStatus !== currentOrder.paymentStatus) {
        changes.push(`Payment is now ${paymentStatus === "paid" ? "confirmed" : "awaiting confirmation"}.`);
      }
      notifyOrderUpdate(order.user, order, changes);
      return res.status(200).json({ msg: "Order updated", order });
    }
    if (currentOrder.status === "cancelled" && status && status !== "cancelled") {
      return res.status(409).json({ msg: "Cancelled orders cannot be reopened" });
    }

    const update = {};
    if (status !== undefined) update.status = status;
    if (paymentStatus !== undefined) {
      update.paymentStatus = paymentStatus;
      if (paymentStatus !== currentOrder.paymentStatus) {
        update.paymentConfirmedAt = paymentStatus === "paid" ? new Date() : null;
      }
    }
    const order = await Order.findOneAndUpdate(
      { _id: currentOrder._id, status: currentOrder.status },
      { $set: update },
      { returnDocument: "after" }
    );
    if (!order) {
      return res.status(409).json({ msg: "Order changed. Refresh and try again." });
    }
    const changes = [];
    if (status !== undefined && status !== currentOrder.status) {
      changes.push(`status changed to ${statusLabels[status]}.`);
    }
    if (paymentStatus !== undefined && paymentStatus !== currentOrder.paymentStatus) {
      changes.push(`Payment is now ${paymentStatus === "paid" ? "confirmed" : "awaiting confirmation"}.`);
    }
    if (changes.length) notifyOrderUpdate(order.user, order, changes);
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
    const paymentAccount = typeof req.body?.paymentAccount === "string"
      ? req.body.paymentAccount.trim().replace(/[\s-]/g, "")
      : "";
    if (typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ msg: "Delivery address is required" });
    }
    if (address.trim().length > 500) {
      return res.status(400).json({ msg: "Delivery address must be 500 characters or fewer" });
    }
    if (!["momo", "airtel_money", "bank_of_kigali"].includes(paymentMethod)) {
      return res.status(400).json({ msg: "Choose a supported payment method" });
    }
    if (paymentMethod === "bank_of_kigali") {
      if (!/^\d{8,20}$/.test(paymentAccount)) {
        return res.status(400).json({ msg: "Enter a valid Bank of Kigali account number" });
      }
    } else if (!/^(?:\+?250|0)?7\d{8}$/.test(paymentAccount)) {
      return res.status(400).json({ msg: "Enter a valid Rwanda mobile money number" });
    }
    if (req.body?.storeId && !mongoose.isValidObjectId(req.body.storeId)) {
      return res.status(400).json({ msg: "Invalid store id" });
    }

    let order;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        let store = null;
        if (req.body?.storeId) {
          store = await Store.findOne({
            _id: req.body.storeId,
            status: "approved",
          }).select("_id").session(session);
          if (!store) {
            const error = new Error("Store is unavailable");
            error.status = 404;
            throw error;
          }
        }

        const user = await User.findById(req.user.id)
          .populate("cart.product")
          .session(session);
        if (!user) {
          const error = new Error("User not found");
          error.status = 404;
          throw error;
        }
        const validCartItems = user.cart.filter((item) => item.product);
        if (validCartItems.length !== user.cart.length) {
          user.cart = validCartItems;
          await user.save({ session });
        }
        const checkoutItems = user.cart.filter((item) => {
          const productStoreId = item.product?.store?._id || item.product?.store || null;
          return store
            ? productStoreId?.toString() === store.id
            : !productStoreId;
        });
        if (!checkoutItems.length) {
          const error = new Error("Your cart is empty");
          error.status = 400;
          throw error;
        }
        for (const item of checkoutItems) {
          if (!item.product || item.quantity > item.product.stock) {
            const error = new Error("A cart item is no longer available in that quantity");
            error.status = 409;
            throw error;
          }
        }

        const items = checkoutItems.map((item) => ({
          product: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        }));
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (!Number.isSafeInteger(Math.round(total)) || !Number.isFinite(total)) {
          const error = new Error("Order total is too large to process");
          error.status = 400;
          throw error;
        }
        for (const item of checkoutItems) {
          const reservation = await Product.updateOne(
            { _id: item.product._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session }
          );
          if (reservation.modifiedCount !== 1) {
            const error = new Error("A cart item is no longer available in that quantity");
            error.status = 409;
            throw error;
          }
        }

        const [createdOrder] = await Order.create([{
          user: user.id,
          items,
          total,
          address: address.trim(),
          paymentMethod,
          paymentAccount,
          store: store?._id || null,
        }], { session });
        order = createdOrder;
        const checkedProductIds = new Set(checkoutItems.map((item) => item.product._id.toString()));
        user.cart = user.cart.filter((item) =>
          item.product && !checkedProductIds.has(item.product._id.toString())
        );
        await user.save({ session });
      });
    } catch (error) {
      if (Number.isInteger(error.status)) {
        return res.status(error.status).json({ msg: error.message });
      }
      throw error;
    } finally {
      await session.endSession();
    }

    notifyOrderUpdate(order.user, order, ["has been received."]);
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
