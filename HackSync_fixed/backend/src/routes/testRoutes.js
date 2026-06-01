import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/participants", async (req, res) => {
  try {
    const participants = await prisma.participant.findMany();

    res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Database Error",
    });
  }
});

export default router;