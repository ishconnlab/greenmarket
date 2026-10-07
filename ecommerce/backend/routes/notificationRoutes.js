import express from "express";
import mongoose from "mongoose";
import PushSubscription from "../models/PushSubscription.js";
import requireAuth from "./authMiddleware.js";
import { getPushPublicKey } from "../services/pushNotifications.js";

const router = express.Router();

router.get("/notifications/public-key", (req, res) => {
  const publicKey = getPushPublicKey();
  if (!publicKey) {
    return res.status(503).json({ msg: "Order notifications are not configured yet" });
  }
  return res.status(200).json({ publicKey });
});

router.post("/notifications/subscribe", requireAuth, async (req, res) => {
  const subscription = req.body;
  if (
    typeof subscription?.endpoint !== "string" ||
    !subscription.endpoint.startsWith("https://") ||
    typeof subscription.keys?.p256dh !== "string" ||
    typeof subscription.keys?.auth !== "string"
  ) {
    return res.status(400).json({ msg: "A valid browser push subscription is required" });
  }

  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user: req.user.id,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    return res.status(201).json({ msg: "Order notifications enabled" });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ msg: "Invalid browser push subscription" });
    }
    console.error("Could not save push subscription:", error);
    return res.status(500).json({ msg: "Could not enable order notifications" });
  }
});

router.delete("/notifications/subscribe", requireAuth, async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== "string") {
    return res.status(400).json({ msg: "A push subscription endpoint is required" });
  }
  try {
    await PushSubscription.deleteOne({ endpoint, user: req.user.id });
    return res.status(200).json({ msg: "Order notifications disabled" });
  } catch (error) {
    console.error("Could not delete push subscription:", error);
    return res.status(500).json({ msg: "Could not disable order notifications" });
  }
});

export default router;
