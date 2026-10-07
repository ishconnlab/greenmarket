import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: { type: String, trim: true, default: "" },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    address: { type: String, required: true, trim: true },
    status: { type: String, default: "pending" },
    paymentMethod: {
      type: String,
      enum: ["momo", "airtel_money", "not_recorded"],
      default: "not_recorded",
    },
    paymentStatus: {
      type: String,
      enum: ["awaiting_confirmation", "paid"],
      default: "awaiting_confirmation",
    },
    paymentConfirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
