import express from "express";
import { PrismaClient } from "@prisma/client";
import { emailQueue } from "../queues/emailQueue.js";

const router = express.Router();
const prisma = new PrismaClient();
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000';

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
    const { rank = "?", score = "?" } = req.body || {};

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    const members = await prisma.teamMember.findMany({
      where: { teamId }
    });

    for (const member of members) {
      if (member.email) {
        // Find participant to get ID
        const participant = await prisma.participant.findFirst({
          where: { email: member.email, eventId: team.eventId }
        });
        
        if (participant) {
          await prisma.participant.update({
            where: { id: participant.id },
            data: { qualified: true, inviteStatus: "INVITED"}
          });

          // Generate AI Email
          let htmlBody = "";
          try {
            const aiRes = await fetch(`${AI_BACKEND_URL}/draft-results-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                participant_name: participant.name,
                team_name: team.name,
                rank,
                score
              })
            });
            const aiData = await aiRes.json();
            htmlBody = aiData.email;
          } catch (e) {
            console.error("AI Email error:", e);
          }

          if (htmlBody) {
            // Log it and Queue it
            const jobId = `participant_results_${participant.id}_${Date.now()}`;
            
            await prisma.aiEmailContent.create({
              data: {
                id: `ai_${jobId}`,
                recipientId: participant.id,
                emailType: 'results',
                subject: `🏆 Congratulations! You Qualified! — ${team.name}`,
                htmlBody
              }
            });

            const emailLog = await prisma.emailLog.create({
              data: {
                jobId,
                recipientId: participant.id,
                recipientEmail: participant.email,
                recipientName: participant.name,
                emailType: 'results',
                status: 'PENDING'
              }
            });

            await emailQueue.add('send_email', {
              emailType: 'results',
              recipientId: participant.id,
              recipientEmail: participant.email,
              recipientName: participant.name,
              templateData: {},
              logId: emailLog.id
            }, { jobId });
          }
        }
      }
    }

    res.json({ success: true, qualified: members.length });
  } catch (err) {
    console.error("Qualify error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/event-status/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const qualifiedCount = await prisma.participant.count({
      where: { eventId, qualified: true }
    });
    res.json({ resultsPublished: qualifiedCount > 0 });
  } catch (err) {
    res.status(500).json({ success: false, resultsPublished: false });
  }
});

// Team submits/updates their GitHub repository URL, and auto-connects it
// for the GitHub Contribution Analyzer (creates or updates the linked GithubRepo row)
router.post("/team/:teamId/github-repo", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { repoUrl } = req.body;

    if (!repoUrl || !/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$/i.test(repoUrl.trim())) {
      return res.status(400).json({ success: false, error: "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo" });
    }

    const cleanUrl = repoUrl.trim().replace(/\/$/, "").replace(/\.git$/, "");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    const parts = cleanUrl.split("/");
    const owner = parts[3];
    const repoName = parts[4];
    if (!owner || !repoName) {
      return res.status(400).json({ success: false, error: "Could not parse owner/repo from that URL" });
    }

    await prisma.team.update({ where: { id: teamId }, data: { githubRepoUrl: cleanUrl } });

    const githubRepo = await prisma.githubRepo.upsert({
      where: { teamId },
      update: { repoUrl: cleanUrl, owner, repoName },
      create: { eventId: team.eventId, teamId, repoUrl: cleanUrl, owner, repoName },
    });

    return res.json({ success: true, githubRepo });
  } catch (err) {
    console.error("GitHub repo submission error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/publish-results/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    await prisma.participant.updateMany({
      where: { eventId },
      data: { stage: "final" }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;