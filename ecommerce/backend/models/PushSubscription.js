import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true, maxlength: 2048 },
    keys: {
      p256dh: { type: String, required: true, minlength: 40, maxlength: 256 },
      auth: { type: String, required: true, minlength: 16, maxlength: 256 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
