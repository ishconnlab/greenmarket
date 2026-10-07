import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";
import requireStoreOwner from "./storeMiddleware.js";
import requireNonAdmin from "./nonAdminMiddleware.js";
import { notifyUser } from "../services/pushNotifications.js";
import { cancelOrderAndRestoreStock, canTransitionOrderStatus } from "../services/orderOperations.js";

const router = express.Router();
const PRODUCT_PAGE_SIZE = 5;
const ORDER_PAGE_SIZE = 10;
const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const productFields = ["slug", "name", "description", "price", "category", "stock", "imageUrl", "imageAlt"];
const stringProductFields = {
  slug: 140,
  name: 120,
  description: 2000,
  category: 60,
  imageUrl: 2048,
  imageAlt: 200,
};

function validateProductStrings(input, storeSlug) {
  for (const [field, maxLength] of Object.entries(stringProductFields)) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== "string" || input[field].trim().length > maxLength) {
      return `${field} must be a text value of ${maxLength} characters or fewer`;
    }
    input[field] = input[field].trim();
  }
  if (input.slug === "") {
    delete input.slug;
  }
  if (input.imageUrl) {
    try {
      const imageUrl = new URL(input.imageUrl);
      if (!["https:", "http:"].includes(imageUrl.protocol) || imageUrl.username || imageUrl.password) {
        return "Product image must use an HTTP or HTTPS URL";
      }
      input.imageUrl = imageUrl.href;
    } catch {
      return "Enter a valid product image URL";
    }
  }
  if (input.slug !== undefined) {
    const productSlug = input.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!productSlug || productSlug.length > 120) return "Enter a valid product URL name";
    input.slug = `${storeSlug}-${productSlug}`;
  }
  return "";
}

router.use("/seller", requireAuth, requireNonAdmin, requireStoreOwner);

router.get("/seller/summary", async (req, res) => {
  try {
    const [totalProducts, lowStockCount, openOrders, sales] = await Promise.all([
      Product.countDocuments({ store: req.store._id }),
      Product.countDocuments({ store: req.store._id, stock: { $gt: 0, $lte: 5 } }),
      Order.countDocuments({ store: req.store._id, status: { $in: ["pending", "processing", "shipped"] } }),
      Order.aggregate([
        { $match: { store: req.store._id, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);
    return res.status(200).json({
      summary: {
        totalProducts,
        lowStockCount,
        openOrders,
        paidSales: sales[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Could not load seller dashboard summary:", error);
    return res.status(500).json({ msg: "Could not load store summary" });
  }
});

router.get("/seller/products", async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const filter = { store: req.store._id };
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PRODUCT_PAGE_SIZE);
    const safePage = totalPages ? Math.min(page, totalPages) : 1;
    const products = await Product.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * PRODUCT_PAGE_SIZE)
      .limit(PRODUCT_PAGE_SIZE);
    return res.status(200).json({
      products,
      pagination: { page: safePage, pageSize: PRODUCT_PAGE_SIZE, total, totalPages },
    });
  } catch (error) {
    console.error("Could not load seller products:", error);
    return res.status(500).json({ msg: "Could not load your products" });
  }
});

router.post("/seller/products", async (req, res) => {
  const input = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => productFields.includes(key))
  );
  if (typeof input.name !== "string" || !input.name.trim()
    || !Number.isFinite(Number(input.price)) || Number(input.price) < 0
    || !Number.isSafeInteger(Number(input.stock)) || Number(input.stock) < 0) {
    return res.status(400).json({ msg: "Enter a product name, valid price, and whole stock quantity" });
  }
  const validationMessage = validateProductStrings(input, req.store.slug);
  if (validationMessage) return res.status(400).json({ msg: validationMessage });
  input.name = input.name.trim();
  input.price = Number(input.price);
  input.stock = Number(input.stock);
  if (!input.slug) delete input.slug;
  try {
    const product = await Product.create({ ...input, store: req.store._id });
    return res.status(201).json({ product });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ msg: "A product with that address already exists" });
    if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ msg: error.message });
    console.error("Could not create seller product:", error);
    return res.status(500).json({ msg: "Could not save product" });
  }
});

router.patch("/seller/products/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid product id" });
  }
  const input = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => productFields.includes(key))
  );
  const clearSlug = Object.hasOwn(input, "slug")
    && typeof input.slug === "string"
    && !input.slug.trim();
  const validationMessage = validateProductStrings(input, req.store.slug);
  if (validationMessage) return res.status(400).json({ msg: validationMessage });
  if (!Object.keys(input).length && !clearSlug) {
    return res.status(400).json({ msg: "Provide product details to update" });
  }
  if ("price" in input) {
    input.price = Number(input.price);
    if (!Number.isFinite(input.price) || input.price < 0) return res.status(400).json({ msg: "Price must be zero or higher" });
  }
  if ("stock" in input) {
    input.stock = Number(input.stock);
    if (!Number.isSafeInteger(input.stock) || input.stock < 0) return res.status(400).json({ msg: "Stock must be a whole number" });
  }
  try {
    const update = { $set: input };
    if (clearSlug) update.$unset = { slug: 1 };
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store: req.store._id },
      update,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ msg: "Store product not found" });
    return res.status(200).json({ product });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ msg: "A product with that address already exists" });
    if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ msg: error.message });
    console.error("Could not update seller product:", error);
    return res.status(500).json({ msg: "Could not update product" });
  }
});

router.delete("/seller/products/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid product id" });
  }
  try {
    const session = await mongoose.startSession();
    let product;
    try {
      await session.withTransaction(async () => {
        product = await Product.findOneAndDelete(
          { _id: req.params.id, store: req.store._id },
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
    if (!product) return res.status(404).json({ msg: "Store product not found" });
    return res.status(200).json({ msg: "Product removed" });
  } catch (error) {
    console.error("Could not delete seller product:", error);
    return res.status(500).json({ msg: "Could not remove product" });
  }
});

router.get("/seller/orders", async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const filter = { store: req.store._id };
    const total = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / ORDER_PAGE_SIZE);
    const safePage = totalPages ? Math.min(page, totalPages) : 1;
    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("items.product", "name imageUrl")
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * ORDER_PAGE_SIZE)
      .limit(ORDER_PAGE_SIZE);
    return res.status(200).json({
      orders,
      pagination: { page: safePage, pageSize: ORDER_PAGE_SIZE, total, totalPages },
    });
  } catch (error) {
    console.error("Could not load seller orders:", error);
    return res.status(500).json({ msg: "Could not load store orders" });
  }
});

router.patch("/seller/orders/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid order id" });
  }
  const { status, paymentStatus } = req.body || {};
  if ((status !== undefined && !orderStatuses.includes(status))
    || (paymentStatus !== undefined && !["awaiting_confirmation", "paid"].includes(paymentStatus))
    || (status === undefined && paymentStatus === undefined)) {
    return res.status(400).json({ msg: "Choose a valid order or payment status" });
  }
  try {
    const current = await Order.findOne({ _id: req.params.id, store: req.store._id });
    if (!current) return res.status(404).json({ msg: "Store order not found" });
    if (status !== undefined && !canTransitionOrderStatus(current.status, status)) {
      return res.status(409).json({ msg: "Order status cannot move backward or be cancelled after shipment" });
    }
    if (status === "cancelled" && paymentStatus !== undefined) {
      return res.status(400).json({ msg: "Update payment confirmation separately from order cancellation" });
    }
    if (current.status === "cancelled"
      && paymentStatus !== undefined
      && paymentStatus !== current.paymentStatus) {
      return res.status(409).json({ msg: "Payment confirmation cannot change after cancellation" });
    }
    if (current.paymentStatus === "paid" && paymentStatus === "awaiting_confirmation") {
      return res.status(409).json({ msg: "Confirmed payment cannot be reverted" });
    }
    if (status === "cancelled" && current.status !== "cancelled") {
      const order = await cancelOrderAndRestoreStock({
        orderId: current._id,
        expectedStatus: current.status,
        storeId: req.store._id,
      });
      if (!order) return res.status(409).json({ msg: "Order changed. Refresh and try again." });
      void notifyUser(order.user, {
        title: `${req.store.name} order update`,
        body: `Order ${order._id.toString().slice(-6).toUpperCase()} was cancelled.`,
        url: "/orders",
      }).catch((error) => console.error("Could not notify customer about seller cancellation:", error));
      return res.status(200).json({ order });
    }

    const update = {};
    if (status !== undefined) update.status = status;
    if (paymentStatus !== undefined && paymentStatus !== current.paymentStatus) {
      update.paymentStatus = paymentStatus;
      update.paymentConfirmedAt = paymentStatus === "paid" ? new Date() : null;
    }
    const order = await Order.findOneAndUpdate(
      { _id: current._id, store: req.store._id, status: current.status },
      { $set: update },
      { new: true }
    );
    if (!order) return res.status(409).json({ msg: "Order changed. Refresh and try again." });

    const changes = [];
    if (status && status !== current.status) changes.push(`status changed to ${status}.`);
    if (paymentStatus && paymentStatus !== current.paymentStatus) changes.push(`payment ${paymentStatus}.`);
    if (changes.length) {
      void notifyUser(order.user, {
        title: `${req.store.name} order update`,
        body: `Order ${order._id.toString().slice(-6).toUpperCase()}: ${changes.join(" ")}`,
        url: "/orders",
      }).catch((error) => console.error("Could not notify customer about seller order update:", error));
    }
    return res.status(200).json({ order });
  } catch (error) {
    console.error("Could not update seller order:", error);
    return res.status(500).json({ msg: "Could not update order" });
  }
});

export default router;
