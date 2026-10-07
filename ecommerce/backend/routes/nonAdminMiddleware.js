import User from "../models/User.js";

export default async function requireNonAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user) return res.status(401).json({ msg: "Account no longer exists" });
    if (user.role === "admin") {
      return res.status(403).json({ msg: "Admin accounts cannot access seller tools" });
    }
    return next();
  } catch (error) {
    console.error("Could not verify seller access:", error);
    return res.status(500).json({ msg: "Could not verify seller access" });
  }
}
