import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

export async function cancelOrderAndRestoreStock({
  orderId,
  expectedStatus,
  paymentStatus,
  paymentConfirmedAt,
  storeId,
}) {
  const session = await mongoose.startSession();
  let order = null;
  try {
    await session.withTransaction(async () => {
      const filter = { _id: orderId, status: expectedStatus };
      if (storeId) filter.store = storeId;

      order = await Order.findOneAndUpdate(
        filter,
        {
          $set: {
            status: "cancelled",
            ...(paymentStatus !== undefined
              ? {
                  paymentStatus,
                  paymentConfirmedAt: paymentStatus === "paid"
                    ? paymentConfirmedAt || new Date()
                    : null,
                }
              : {}),
          },
        },
        { new: true, session }
      );
      if (!order) return;

      for (const item of order.items) {
        const productFilter = { _id: item.product };
        if (storeId) productFilter.store = storeId;
        await Product.updateOne(
          productFilter,
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
    });
    return order;
  } finally {
    await session.endSession();
  }
}
