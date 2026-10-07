import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export default function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ msg: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof payload === "string" ||
      !mongoose.isValidObjectId(payload.id)
    ) {
      return res.status(401).json({ msg: "Invalid token" });
    }
    req.user = { id: payload.id };
    return next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
}
