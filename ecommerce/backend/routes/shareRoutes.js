import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Store from "../models/Store.js";

const router = express.Router();
const crawlerPattern = /googlebot|bingbot|facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot/i;

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

const storeIconColors = ["#176b45", "#295d79", "#8f5537", "#70528a", "#9a6734"];

function getStoreIconColor(slug) {
  const hash = [...slug].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  return storeIconColors[hash % storeIconColors.length];
}

function buildStoreIcon(store) {
  const color = getStoreIconColor(store.slug);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${color}"/><path d="M190 190v-30c0-46 28-76 66-76s66 30 66 76v30" fill="none" stroke="#e5efdc" stroke-linecap="round" stroke-width="17"/><path d="M132 183h248l-19 245c-1 15-13 27-28 27h-154c-15 0-27-12-28-27z" fill="#f5f3ea"/><path d="M190 243c34 0 56 22 61 65-42-5-65-28-61-65Z" fill="#78a96b"/><path d="M257 294c4-41 27-63 66-66 1 37-22 61-66 66Z" fill="#a6c88e"/><path d="M214 291c31 17 51 39 64 71" fill="none" stroke="#286c49" stroke-linecap="round" stroke-width="10"/></svg>`;
  return { svg, color };
}

async function findApprovedStore(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return null;
  return Store.findOne({ slug: slug.toLowerCase(), status: "approved" })
    .select("name slug description logoUrl")
    .lean();
}

router.get("/stores/:slug/app-icon.svg", async (req, res) => {
  try {
    const store = await findApprovedStore(req.params.slug);
    if (!store) return res.status(404).type("text/plain").send("Store not found");
    const { svg } = buildStoreIcon(store);
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.type("image/svg+xml").status(200).send(svg);
  } catch (error) {
    console.error("Could not generate standalone store icon:", error);
    return res.status(500).type("text/plain").send("Could not generate store icon");
  }
});

router.get("/stores/:slug/manifest.webmanifest", async (req, res) => {
  try {
    const store = await findApprovedStore(req.params.slug);
    if (!store) return res.status(404).json({ msg: "Store not found" });
    const basePath = `/store/${encodeURIComponent(store.slug)}/`;
    const iconPath = `${basePath}app-icon.svg`;
    const { color } = buildStoreIcon(store);
    const manifest = {
      id: basePath,
      name: store.name,
      short_name: store.name.trim().slice(0, 24),
      description: store.description,
      start_url: `${basePath}?source=store-pwa`,
      scope: basePath,
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      background_color: "#fbfcfa",
      theme_color: color,
      orientation: "portrait-primary",
      categories: ["shopping", "business"],
      icons: [{ src: iconPath, sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    };
    res.set("Cache-Control", "public, max-age=900, s-maxage=900");
    return res.type("application/manifest+json").status(200).send(JSON.stringify(manifest));
  } catch (error) {
    console.error("Could not generate standalone store manifest:", error);
    return res.status(500).json({ msg: "Could not generate store manifest" });
  }
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    const storefrontOrigin = (process.env.FRONTEND_URL || "https://greenmarket-livid.vercel.app").replace(/\/+$/, "");
    const stores = await Store.find({ status: "approved" }).select("_id slug updatedAt").lean();
    const products = await Product.find({
      $or: [
        { store: null },
        { store: { $exists: false } },
        { store: { $in: stores.map((store) => store._id) } },
      ],
    }).select("_id store updatedAt").lean();
    const entries = [
      { url: new URL("/", storefrontOrigin), updatedAt: null },
      ...["help", "guide", "policies", "privacy"].map((path) => ({
        url: new URL(`/${path}`, storefrontOrigin),
        updatedAt: null,
      })),
      ...stores.map((store) => ({
        url: new URL(`/store/${encodeURIComponent(store.slug)}`, storefrontOrigin),
        updatedAt: store.updatedAt,
      })),
      ...products.map((product) => {
        return {
          url: new URL(`/products/${product._id}`, storefrontOrigin),
          updatedAt: product.updatedAt,
        };
      }),
    ];
    const urls = entries.map(({ url, updatedAt }) => (
      `<url><loc>${escapeHtml(url.href)}</loc>${updatedAt ? `<lastmod>${new Date(updatedAt).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`
    )).join("");

    res.set("Cache-Control", "public, max-age=900, s-maxage=900");
    res.type("application/xml");
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  } catch (error) {
    console.error("Could not generate the Green Market sitemap:", error);
    return res.status(500).type("text/plain").send("Could not generate sitemap");
  }
});

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
    const canonicalProductUrl = new URL(`/products/${product._id}`, storefrontOrigin).href;
    const shareUrl = new URL(`/share/products/${product._id}`, storefrontOrigin).href;
    const imageUrl = safeImageUrl(
      product.imageUrl,
      new URL("/social-card.png", storefrontOrigin).href
    );
    const price = new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    }).format(product.price);
    const safePrice = escapeHtml(String(product.price));
    const description = [product.description, `${product.category || "Product"} · ${price}`]
      .filter(Boolean)
      .join(" — ");
    const title = `${product.name} | Green Market`;
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeShareUrl = escapeHtml(shareUrl);
    const safeStorefrontUrl = escapeHtml(storefrontProductUrl.href);
    const safeCanonicalProductUrl = escapeHtml(canonicalProductUrl);
    const safeImage = escapeHtml(imageUrl);
    const safeImageAlt = escapeHtml(product.imageAlt || product.name);
    const productStructuredData = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: [imageUrl],
      description,
      sku: String(product._id),
      brand: { "@type": "Brand", name: "Green Market" },
      offers: {
        "@type": "Offer",
        url: canonicalProductUrl,
        priceCurrency: "RWF",
        price: String(product.price),
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    }).replace(/</g, "\\u003c");

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
  <link rel="canonical" href="${safeCanonicalProductUrl}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Green Market">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeShareUrl}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:alt" content="${safeImageAlt}">
  <meta property="product:price:amount" content="${safePrice}">
  <meta property="product:price:currency" content="RWF">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  <script type="application/ld+json">${productStructuredData}</script>
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
