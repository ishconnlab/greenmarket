import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      unique: true,
      maxlength: 60,
    },
    description: { type: String, required: true, trim: true, maxlength: 1200 },
    category: { type: String, trim: true, maxlength: 80, default: "" },
    phone: { type: String, trim: true, maxlength: 32, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    address: { type: String, trim: true, maxlength: 240, default: "" },
    logoUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    bannerUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paused", "removed"],
      default: "pending",
      index: true,
    },
    reviewNote: { type: String, trim: true, maxlength: 1000, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

storeSchema.index({ owner: 1, updatedAt: -1 });
storeSchema.index({ owner: 1 }, { unique: true });

export default mongoose.model("Store", storeSchema);
