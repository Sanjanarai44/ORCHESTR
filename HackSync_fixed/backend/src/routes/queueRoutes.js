import express from "express";
const router = express.Router();

// Redis/BullMQ disabled for demo (requires Redis 5+)
router.get("/add-job", (req, res) => {
  res.json({ success: false, message: "Queue disabled — Redis 5+ required" });
});

export default router;