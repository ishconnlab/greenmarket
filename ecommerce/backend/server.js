import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import promotionRoutes, { initializeDefaultPromotions } from "./routes/promotionRoutes.js";
import shareRoutes from "./routes/shareRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import { initializePushNotifications } from "./services/pushNotifications.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || (process.env.NODE_ENV !== "production" && !allowedOrigins.length)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});
app.use("/api", authRoutes);
app.use("/api", productRoutes);
app.use("/api", cartRoutes);
app.use("/api", orderRoutes);
app.use("/api", notificationRoutes);
app.use("/api", contactRoutes);
app.use("/api", promotionRoutes);
app.use("/api", storeRoutes);
app.use("/api", sellerRoutes);
app.use("/share", shareRoutes);

app.use("/api", (req, res) => {
  return res.status(404).json({ msg: "API route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({
    msg: status === 500 ? "Internal server error" : error.message,
  });
});

async function startServer() {
  initializePushNotifications();
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is required");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  if (process.env.NODE_ENV === "production" && !allowedOrigins.length) {
    throw new Error("CORS_ORIGIN is required in production");
  }

  await mongoose.connect(mongoUri);
  await initializeDefaultPromotions();
  console.log("Connected to MongoDB");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});
