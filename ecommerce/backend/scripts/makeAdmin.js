import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

async function promoteAccount() {
  const email = process.argv[2]?.trim().toLowerCase();
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!email) {
    throw new Error("Usage: npm run make-admin -- account@example.com");
  }
  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is required to promote an account");
  }

  await mongoose.connect(mongoUri);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin" } },
    { new: true, runValidators: true }
  ).select("name email role");

  if (!user) {
    throw new Error(`No registered account found for ${email}`);
  }

  console.log(`Admin access granted to ${user.email}. Sign out and sign in again to refresh the session.`);
}

promoteAccount()
  .catch((error) => {
    console.error("Could not grant admin access:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
