import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/feedback
router.post("/", async (req, res) => {
  try {
    const {
      eventId,
      userId,
      userType,
      starRating,
      timelineClear,
      aiMentorUseful,
      participateAgain,
      criteriaClear,
      openText
    } = req.body;

    if (!eventId || !userId || !userType || starRating === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Upsert to handle multiple submissions gracefully (though UI should prevent it)
    const feedback = await prisma.feedback.upsert({
      where: {
        eventId_userId_userType: { eventId: String(eventId), userId: String(userId), userType }
      },
      update: {
        starRating: parseInt(starRating),
        timelineClear,
        aiMentorUseful,
        participateAgain,
        criteriaClear,
        openText
      },
      create: {
        eventId: String(eventId),
        userId: String(userId),
        userType,
        starRating: parseInt(starRating),
        timelineClear,
        aiMentorUseful,
        participateAgain,
        criteriaClear,
        openText
      }
    });

    res.json({ success: true, feedback });
  } catch (err) {
    console.error("Error submitting feedback:", err);
    res.status(500).json({ success: false, error: "Failed to submit feedback" });
  }
});

// GET /api/admin/feedback/stats
router.get("/stats", async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ success: false, error: "Missing eventId" });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { eventId: String(eventId) }
    });

    let total = feedbacks.length;
    let participantCount = 0;
    let judgeCount = 0;
    let starSum = 0;
    let timelineYes = 0;
    let aiMentorYes = 0;
    let participateYes = 0;
    let criteriaYes = 0;
    const openTexts = [];

    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    feedbacks.forEach(f => {
      if (f.userType === "PARTICIPANT") {
        participantCount++;
        if (f.timelineClear) timelineYes++;
        if (f.aiMentorUseful) aiMentorYes++;
        if (f.participateAgain) participateYes++;
      } else if (f.userType === "JUDGE") {
        judgeCount++;
        if (f.criteriaClear) criteriaYes++;
      }
      
      starSum += f.starRating;
      if (starCounts[f.starRating] !== undefined) {
        starCounts[f.starRating]++;
      }

      if (f.openText && f.openText.trim().length > 0) {
        openTexts.push({ userType: f.userType, text: f.openText });
      }
    });

    res.json({
      success: true,
      stats: {
        total,
        participantCount,
        judgeCount,
        averageStar: total > 0 ? (starSum / total).toFixed(1) : 0,
        starCounts,
        percentages: {
          timelineClear: participantCount > 0 ? Math.round((timelineYes / participantCount) * 100) : 0,
          aiMentorUseful: participantCount > 0 ? Math.round((aiMentorYes / participantCount) * 100) : 0,
          participateAgain: participantCount > 0 ? Math.round((participateYes / participantCount) * 100) : 0,
          criteriaClear: judgeCount > 0 ? Math.round((criteriaYes / judgeCount) * 100) : 0
        },
        openTexts
      }
    });
  } catch (err) {
    console.error("Error fetching feedback stats:", err);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

export default router;
