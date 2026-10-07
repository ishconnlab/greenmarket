import Store from "../models/Store.js";

export default async function requireStoreOwner(req, res, next) {
  try {
    const store = await Store.findOne({
      owner: req.user.id,
      status: { $in: ["approved", "paused"] },
    }).sort({ updatedAt: -1 });
    if (!store) {
      return res.status(403).json({ msg: "An approved store is required" });
    }
    req.store = store;
    return next();
  } catch (error) {
    console.error("Could not verify store ownership:", error);
    return res.status(500).json({ msg: "Could not verify store access" });
  }
}
