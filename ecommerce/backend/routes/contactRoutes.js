import express from "express";
import mongoose from "mongoose";
import ContactMessage from "../models/ContactMessage.js";
import User from "../models/User.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";
import { notifyUser } from "../services/pushNotifications.js";

const router = express.Router();
const messageTypes = ["message", "wish", "report", "help"];

router.use("/contact/messages", requireAuth);

router.get("/contact/messages", async (req, res) => {
  try {
    const messages = await ContactMessage.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Could not load customer contact messages:", error);
    return res.status(500).json({ msg: "Could not load your messages" });
  }
});

router.post("/contact/messages", async (req, res) => {
  const { type = "message", message } = req.body || {};
  if (!messageTypes.includes(type) || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ msg: "Choose a valid message type and enter a message" });
  }
  if (message.trim().length > 3000) {
    return res.status(400).json({ msg: "Messages must be 3,000 characters or fewer" });
  }

  try {
    const user = await User.findById(req.user.id).select("name email");
    if (!user) return res.status(404).json({ msg: "Account not found" });
    const contactMessage = await ContactMessage.create({
      user: user._id,
      name: user.name,
      email: user.email,
      type,
      message: message.trim(),
    });
    return res.status(201).json({
      msg: "Your message has been sent to Green Market support",
      message: contactMessage,
    });
  } catch (error) {
    console.error("Could not save contact message:", error);
    return res.status(500).json({ msg: "Could not send your message" });
  }
});

router.get("/admin/messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Could not load admin contact messages:", error);
    return res.status(500).json({ msg: "Could not load customer messages" });
  }
});

router.patch("/admin/messages/:id/reply", requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid message id" });
  }
  const reply = req.body?.reply;
  if (typeof reply !== "string" || !reply.trim()) {
    return res.status(400).json({ msg: "Enter a reply before sending" });
  }
  if (reply.trim().length > 3000) {
    return res.status(400).json({ msg: "Replies must be 3,000 characters or fewer" });
  }

  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { $set: { reply: reply.trim(), repliedAt: new Date() } },
      { returnDocument: "after", runValidators: true }
    );
    if (!message) return res.status(404).json({ msg: "Message not found" });

    void notifyUser(message.user, {
      title: "Green Market support replied",
      body: `There’s a reply to your ${message.type} in your profile.`,
      url: "/profile#messages",
    }).catch((error) => {
      console.error("Could not notify customer of support reply:", error);
    });

    return res.status(200).json({ msg: "Reply sent", message });
  } catch (error) {
    console.error("Could not send admin reply:", error);
    return res.status(500).json({ msg: "Could not send reply" });
  }
});

export default router;
