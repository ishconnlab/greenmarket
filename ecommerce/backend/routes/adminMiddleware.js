import User from "../models/User.js";

export default async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user) {
      return res.status(401).json({ msg: "Account no longer exists" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Could not verify admin access" });
  }
}
