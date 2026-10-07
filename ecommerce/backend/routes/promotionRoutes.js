import express from "express";
import mongoose from "mongoose";
import Promotion from "../models/Promotion.js";
import PromotionSettings from "../models/PromotionSettings.js";
import requireAuth from "./authMiddleware.js";
import requireAdmin from "./adminMiddleware.js";

const router = express.Router();
const allowedFields = ["eyebrow", "title", "detail", "imageUrl", "imageAlt", "mediaUrl", "active", "position"];
const stringFieldLimits = {
  eyebrow: 60,
  title: 100,
  detail: 120,
  imageUrl: 2048,
  imageAlt: 160,
  mediaUrl: 2048,
};
const defaultPromotions = [
  {
    eyebrow: "TRENDING AT THE MARKET",
    title: "Fresh picks for your week",
    detail: "See what just arrived",
    imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=240&q=80",
    imageAlt: "Fresh colorful produce",
    position: 0,
  },
  {
    eyebrow: "GOOD THINGS, GROWING",
    title: "Make everyday meals brighter",
    detail: "Browse market favourites",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=240&q=80",
    imageAlt: "Vegetables ready for the kitchen",
    position: 1,
  },
  {
    eyebrow: "A LITTLE HOME REFRESH",
    title: "Thoughtful finds for home",
    detail: "Explore the collection",
    imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=240&q=80",
    imageAlt: "Warm, comfortable home",
    position: 2,
  },
];

export async function initializeDefaultPromotions() {
  const key = "market-promotions";
  const existingSettings = await PromotionSettings.findOne({ key });
  if (existingSettings) return;

  try {
    const settings = await PromotionSettings.create({ key, defaultsInitialized: true });
    if (settings.defaultsInitialized) {
      const existingCount = await Promotion.countDocuments();
      if (existingCount === 0) await Promotion.insertMany(defaultPromotions);
    }
  } catch (error) {
    if (error.code === 11000) return;
    await PromotionSettings.deleteOne({ key }).catch((cleanupError) => {
      console.error("Could not reset promotion initialization marker:", cleanupError);
    });
    throw error;
  }
}

function getPromotionInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.includes(key))
  );
  if (!partial) {
    for (const field of ["eyebrow", "title", "detail"]) {
      if (typeof input[field] !== "string" || !input[field].trim()) return null;
    }
  }
  for (const field of ["eyebrow", "title", "detail", "imageUrl", "imageAlt", "mediaUrl"]) {
    if (field in input && typeof input[field] !== "string") return null;
    if (field in input && input[field].trim().length > stringFieldLimits[field]) return null;
  }
  for (const field of ["active"]) {
    if (field in input && typeof input[field] !== "boolean") return null;
  }
  if ("position" in input && (!Number.isSafeInteger(input.position) || input.position < 0 || input.position > 10000)) return null;
  for (const field of ["imageUrl", "mediaUrl"]) {
    const value = input[field]?.trim();
    if (value) {
      try {
        const url = new URL(value);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
        if (field === "mediaUrl" && !isSupportedMediaUrl(url)) return null;
        input[field] = url.toString();
      } catch {
        return null;
      }
    }
    if (field in input) input[field] = value || "";
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ])
  );
}

function isSupportedMediaUrl(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (["youtu.be", "youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    return Boolean(getYouTubeId(url));
  }
  return host === "instagram.com"
    && /^\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?/.test(url.pathname);
}

function getYouTubeId(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
  const segments = url.pathname.split("/").filter(Boolean);
  const id = url.searchParams.get("v")
    || (["shorts", "embed", "live"].includes(segments[0]) ? segments[1] : "");
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
}

router.get("/promotions", async (req, res) => {
  try {
    const promotions = await Promotion.find({ active: true }).sort({ position: 1, createdAt: 1 }).lean();
    return res.status(200).json({ promotions });
  } catch (error) {
    console.error("Could not load promotions:", error);
    return res.status(500).json({ msg: "Could not load promotions" });
  }
});

router.get("/admin/promotions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ position: 1, createdAt: 1 }).lean();
    return res.status(200).json({ promotions });
  } catch (error) {
    console.error("Could not load admin promotions:", error);
    return res.status(500).json({ msg: "Could not load promotions" });
  }
});

router.post("/admin/promotions", requireAuth, requireAdmin, async (req, res) => {
  const input = getPromotionInput(req.body);
  if (!input) return res.status(400).json({ msg: "Enter a title, headline, and valid promotion details" });
  try {
    if (input.position === undefined) input.position = await Promotion.countDocuments();
    const promotion = await Promotion.create(input);
    return res.status(201).json({ promotion });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ msg: "Invalid promotion details" });
    }
    console.error("Could not create promotion:", error);
    return res.status(500).json({ msg: "Could not save promotion" });
  }
});

router.patch("/admin/promotions/:id", requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid promotion id" });
  }
  const input = getPromotionInput(req.body, { partial: true });
  if (!input || !Object.keys(input).length) {
    return res.status(400).json({ msg: "Provide valid promotion details to update" });
  }
  try {
    const promotion = await Promotion.findByIdAndUpdate(req.params.id, input, {
      new: true,
      runValidators: true,
    });
    if (!promotion) return res.status(404).json({ msg: "Promotion not found" });
    return res.status(200).json({ promotion });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ msg: error.message });
    }
    console.error("Could not update promotion:", error);
    return res.status(500).json({ msg: "Could not update promotion" });
  }
});

router.delete("/admin/promotions/:id", requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid promotion id" });
  }
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) return res.status(404).json({ msg: "Promotion not found" });
    return res.status(200).json({ msg: "Promotion removed" });
  } catch (error) {
    console.error("Could not delete promotion:", error);
    return res.status(500).json({ msg: "Could not remove promotion" });
  }
});

export default router;
