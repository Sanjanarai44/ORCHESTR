import express from "express";
import {
  parseRepoUrl,
  getRepoCommits,
  getRepoPRs,
  getRepoIssues,
  analyzeContributions,
} from "../services/githubService.js";
import prisma from '../config/prisma.js';

const router = express.Router();

// Shared: runs the GitHub fetch + scoring + persistence for a given GithubRepo row
async function runAnalysisForRepo(githubRepo) {
  const { id: repoId, owner, repoName } = githubRepo;

  const commits = await getRepoCommits(owner, repoName);
  const prs = await getRepoPRs(owner, repoName);
  const issues = await getRepoIssues(owner, repoName);

  const leaderboard = analyzeContributions(commits, prs, issues);

  await prisma.githubAnalysis.deleteMany({ where: { repoId } });

  await prisma.$transaction(
    leaderboard.map((user) =>
      prisma.githubAnalysis.create({
        data: {
          repoId,
          githubUsername: user.username,
          commits: user.commits,
          pullRequests: user.prs,
          issues: user.issues,
          contributionScore: user.score,
        },
      })
    )
  );

  return { owner, repoName, leaderboard };
}

// Resolves a team's connected GithubRepo via the team's githubRepoUrl string
// field — string matching, not a teamId foreign key, so it works regardless
// of whether that schema migration has been applied.
async function resolveTeamRepo(teamId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team?.githubRepoUrl) return { team, githubRepo: null };

  const githubRepo = await prisma.githubRepo.findFirst({
    where: { repoUrl: team.githubRepoUrl },
  });

  return { team, githubRepo };
}

router.post("/test", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    const { owner, repo } = parseRepoUrl(repoUrl);

    const commits = await getRepoCommits(owner, repo);
    const prs = await getRepoPRs(owner, repo);
    const issues = await getRepoIssues(owner, repo);

    res.json({
      success: true,
      commits: commits.length,
      prs: prs.length,
      issues: issues.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/analyze", async (req, res) => {
  try {
    const { repoUrl } = req.body;
    const { owner, repo } = parseRepoUrl(repoUrl);

    const commits = await getRepoCommits(owner, repo);
    const prs = await getRepoPRs(owner, repo);
    const issues = await getRepoIssues(owner, repo);

    const leaderboard = analyzeContributions(commits, prs, issues);

    res.json({
      success: true,
      repository: `${owner}/${repo}`,
      leaderboard,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/connect", async (req, res) => {
  try {
    const { eventId, repoUrl } = req.body;
    const { owner, repo } = parseRepoUrl(repoUrl);

    const githubRepo = await prisma.githubRepo.create({
      data: { eventId, repoUrl, owner, repoName: repo },
    });

    res.json({ success: true, githubRepo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Re-fetches live GitHub data for a connected repo, replaces its stored
// analysis with fresh rows, and returns the leaderboard for display.
router.post("/analyze/:repoId", async (req, res) => {
  try {
    const { repoId } = req.params;

    const githubRepo = await prisma.githubRepo.findUnique({ where: { id: repoId } });
    if (!githubRepo) {
      return res.status(404).json({ success: false, message: "GitHub repository not found" });
    }

    const { owner, repoName, leaderboard } = await runAnalysisForRepo(githubRepo);

    res.json({ success: true, repository: `${owner}/${repoName}`, leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Organizer-facing convenience: analyze straight from a teamId, since the
// Evaluations tab only has teamId on hand, not the underlying repoId.
router.post("/analyze/team/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { team, githubRepo } = await resolveTeamRepo(teamId);

    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }
    if (!githubRepo) {
      return res.status(404).json({ success: false, message: "This team hasn't linked a GitHub repository yet" });
    }

    const { owner, repoName, leaderboard } = await runAnalysisForRepo(githubRepo);

    res.json({ success: true, repository: `${owner}/${repoName}`, leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Read-only: returns the last saved leaderboard for a team without
// re-hitting the GitHub API. Used by the Evaluations/Judge views to show
// contribution breakdowns without forcing a re-analyze on every page load.
router.get("/team/:teamId/leaderboard", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { team, githubRepo } = await resolveTeamRepo(teamId);

    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }
    if (!githubRepo) {
      return res.json({ success: true, connected: false, leaderboard: [] });
    }

    const rows = await prisma.githubAnalysis.findMany({
      where: { repoId: githubRepo.id },
      orderBy: { contributionScore: "desc" },
    });

    const totalScore = rows.reduce((sum, r) => sum + r.contributionScore, 0);

    const leaderboard = rows.map((r) => {
      const percentage = totalScore > 0 ? Number(((r.contributionScore / totalScore) * 100).toFixed(2)) : 0;
      let status = "Normal";
      if (percentage < 5) status = "Low Participation";
      if (percentage > 70) status = "Dominating Contributions";

      return {
        username: r.githubUsername,
        commits: r.commits,
        prs: r.pullRequests,
        issues: r.issues,
        score: r.contributionScore,
        percentage,
        status,
      };
    });

    res.json({
      success: true,
      connected: true,
      repository: `${githubRepo.owner}/${githubRepo.repoName}`,
      lastAnalyzed: rows[0]?.updatedAt || null,
      leaderboard,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;