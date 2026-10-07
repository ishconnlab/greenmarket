import mongoose from "mongoose";

const promotionSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  defaultsInitialized: { type: Boolean, default: false },
});

export default mongoose.model("PromotionSettings", promotionSettingsSchema);
