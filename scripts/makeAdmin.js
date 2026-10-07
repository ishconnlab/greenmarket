import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

async function promoteAccount() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run make-admin -- account@example.com");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to promote an account");
  }

  await mongoose.connect(process.env.MONGO_URI);
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
