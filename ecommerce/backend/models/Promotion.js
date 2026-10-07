import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, required: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    detail: { type: String, required: true, trim: true, maxlength: 120 },
    imageUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    imageAlt: { type: String, trim: true, maxlength: 160, default: "" },
    mediaUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    active: { type: Boolean, default: true },
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Promotion", promotionSchema);
