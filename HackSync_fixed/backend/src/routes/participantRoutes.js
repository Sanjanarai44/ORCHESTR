import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// If Option A: This maps to GET http://localhost:5000/api/participants
// If Option B: This maps to GET http://localhost:5000/api/admin/participants
router.get("/", async (req, res) => {
  try {
    const participants = await prisma.participant.findMany({
      orderBy: {
        name: "asc", 
      },
    });

    return res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.error("Database fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve directory records",
      error: error.message,
    });
  }
});

export default router;