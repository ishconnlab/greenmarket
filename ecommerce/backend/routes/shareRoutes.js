import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Store from "../models/Store.js";

const router = express.Router();
const crawlerPattern = /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot/i;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function safeImageUrl(value, fallback) {
  try {
    const imageUrl = new URL(value);
    return ["http:", "https:"].includes(imageUrl.protocol) ? imageUrl.href : fallback;
  } catch {
    return fallback;
  }
}

router.get("/products/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).send("Product not found");
  }

  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).send("Product not found");

    const storefrontOrigin = process.env.FRONTEND_URL || "https://greenmarket-livid.vercel.app";
    let storefrontPath = "/";
    if (product.store) {
      const store = await Store.findOne({ _id: product.store, status: "approved" }).select("slug").lean();
      if (!store) return res.status(404).send("Product not found");
      storefrontPath = `/store/${encodeURIComponent(store.slug)}`;
    }
    const storefrontProductUrl = new URL(storefrontPath, storefrontOrigin);
    storefrontProductUrl.searchParams.set("product", String(product._id));
    if (!product.store) storefrontProductUrl.hash = "shop";
    const shareUrl = new URL(`/share/products/${product._id}`, storefrontOrigin).href;
    const imageUrl = safeImageUrl(
      product.imageUrl,
      new URL("/favicon.svg", storefrontOrigin).href
    );
    const price = new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    }).format(product.price);
    const description = [product.description, `${product.category || "Product"} · ${price}`]
      .filter(Boolean)
      .join(" — ");
    const title = `${product.name} | Green Market`;
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeShareUrl = escapeHtml(shareUrl);
    const safeStorefrontUrl = escapeHtml(storefrontProductUrl.href);
    const safeImage = escapeHtml(imageUrl);
    const safeImageAlt = escapeHtml(product.imageAlt || product.name);

    if (!crawlerPattern.test(req.get("user-agent") || "")) {
      return res.redirect(302, storefrontProductUrl.href);
    }

    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.type("html");
    return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${safeStorefrontUrl}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Green Market">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeShareUrl}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:alt" content="${safeImageAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    <img src="${safeImage}" alt="${safeImageAlt}" width="480">
    <p><a href="${safeStorefrontUrl}">View this product at Green Market</a></p>
  </main>
</body>
</html>`);
  } catch (error) {
    console.error("Could not build product share page:", error);
    return res.status(500).send("Could not load product details");
  }
});

export default router;
