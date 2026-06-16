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
// Participant confirms or declines progression invitation
router.post("/:id/respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!["CONFIRMED", "DECLINED"].includes(response)) {
      return res.status(400).json({ success: false, error: "Invalid response" });
    }

    const updated = await prisma.participant.update({
      where: { id },
      data: { inviteStatus: response }
    });

    res.json({ success: true, participant: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Committee marks a team's participants as qualified
router.post("/qualify-team/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;

    const members = await prisma.teamMember.findMany({
      where: { teamId }
    });

    for (const member of members) {
      if (member.email) {
        await prisma.participant.updateMany({
          where: { email: member.email },
          data: { qualified: true, inviteStatus: "INVITED" }
        });
      }
    }

    res.json({ success: true, qualified: members.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;