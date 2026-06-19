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
          data: { qualified: true, inviteStatus: "INVITED"}
        });
      }
    }

    res.json({ success: true, qualified: members.length });
  } catch (err) {
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