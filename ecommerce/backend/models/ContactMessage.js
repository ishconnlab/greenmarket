import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    type: {
      type: String,
      enum: ["message", "wish", "report", "help"],
      default: "message",
    },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    reply: { type: String, trim: true, maxlength: 3000, default: "" },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("ContactMessage", contactMessageSchema);
