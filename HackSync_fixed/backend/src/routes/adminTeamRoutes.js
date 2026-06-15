import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { emailQueue } from "../queues/emailQueue.js";

const router = express.Router();
const DEFAULT_RETRY_LIMIT = 80;

const SKILL_MAP = {
  Frontend: ["frontend", "frontend developer", "front end", "fe", "ui", "dev", "developer", "fullstack", "full stack", "react", "vue", "angular", "html", "css", "javascript", "typescript", "web"],
  Backend: ["backend", "backend developer", "back end", "be", "api", "system design", "systems design", "node", "python", "java", "server", "database", "db", "devops", "cloud", "aws", "ml", "ai"],
  Designer: ["designer", "design", "ui/ux", "ux", "ui ux", "graphic", "figma", "product design", "ux designer", "product designer", "creative"],
};

function normalizeSkill(skill) {
  const v = String(skill || "").trim().toLowerCase();
  for (const [role, keywords] of Object.entries(SKILL_MAP)) {
    if (keywords.some(k => v === k || v.includes(k))) return role;
  }
  if (v.includes("front") || v.includes("react") || v.includes("ui")) return "Frontend";
  if (v.includes("back") || v.includes("api") || v.includes("server")) return "Backend";
  if (v.includes("design") || v.includes("ux") || v.includes("graphic")) return "Designer";
  return null;
}

function normalizeCollege(college) {
  return String(college || "Unknown").trim();
}

function teamPenalty(team) {
  const colleges = team.map(m => m.college);
  return colleges.length - new Set(colleges).size;
}

function tryImproveDiversity(teams) {
  let bestMove = null;
  for (let a = 0; a < teams.length; a++) {
    for (let b = a + 1; b < teams.length; b++) {
      const before = teamPenalty(teams[a]) + teamPenalty(teams[b]);
      for (let i = 0; i < teams[a].length; i++) {
        if (i >= teams[b].length) continue;
        if (teams[a][i].college === teams[b][i].college) continue;
        const swA = [...teams[a]]; swA[i] = teams[b][i];
        const swB = [...teams[b]]; swB[i] = teams[a][i];
        const after = teamPenalty(swA) + teamPenalty(swB);
        const improvement = before - after;
        if (improvement > 0 && (!bestMove || improvement > bestMove.improvement)) {
          bestMove = { a, b, i, improvement };
        }
      }
    }
  }
  if (!bestMove) return null;
  const tmp = teams[bestMove.a][bestMove.i];
  teams[bestMove.a][bestMove.i] = teams[bestMove.b][bestMove.i];
  teams[bestMove.b][bestMove.i] = tmp;
  return bestMove;
}

function toParticipantView(m) {
  return { id: m.id, name: m.name, email: m.email, college: m.college, skill: m.skill };
}

// FULLY CONFIGURABLE team builder — respects all committee rules
function buildTeams(participants, rules = {}) {
  const {
    teamSize = 3,
    retryLimit = 80,
    skillBalance = "strict",
    collegeDiversity = "best_effort",
    excludeTags = [],
  } = rules;

  // Filter out excluded skill tags
  const filtered = excludeTags.length > 0
    ? participants.filter(p =>
        !excludeTags.some(tag => String(p.skill || "").toLowerCase().includes(tag))
      )
    : participants;

  // FLEXIBLE mode — skip skill pools entirely
  if (skillBalance === "flexible") {
    const all = filtered.map(p => ({
      id: p.id, name: p.name, email: p.email,
      college: normalizeCollege(p.college),
      skill: normalizeSkill(p.skill) || p.skill || "General",
    }));
    const teams = [];
    for (let i = 0; i < all.length; i += teamSize) {
      const chunk = all.slice(i, i + teamSize);
      if (chunk.length > 0) teams.push(chunk);
    }
    const overflow = all.length % teamSize !== 0
      ? all.slice(Math.floor(all.length / teamSize) * teamSize)
      : [];

    // Still apply diversity if requested
    let swaps = 0;
    if (collegeDiversity !== "none") {
      for (let attempt = 0; attempt < retryLimit; attempt++) {
        const dups = teams.reduce((s, t) => s + teamPenalty(t), 0);
        if (dups === 0) break;
        if (!tryImproveDiversity(teams)) break;
        swaps++;
      }
    }
    return {
      teams: teams.filter(t => t.length > 0),
      overflowParticipants: overflow,
      maxTeams: teams.length,
      successfulSwaps: swaps,
      relaxedDiversityConstraint: false,
    };
  }

  // STRICT or BALANCED mode — use skill pools
  const pools = { Frontend: [], Backend: [], Designer: [] };
  const unclassified = [];

  for (const p of filtered) {
    const role = normalizeSkill(p.skill);
    const normalized = {
      id: p.id, name: p.name, email: p.email,
      college: normalizeCollege(p.college),
      skill: role || p.skill || "General",
    };
    if (role) pools[role].push(normalized);
    else unclassified.push(normalized);
  }

  const balancedCount = Math.min(
    pools.Frontend.length,
    pools.Backend.length,
    pools.Designer.length
  );
  const teams = [];

  // Build skill-balanced teams
  for (let i = 0; i < balancedCount; i++) {
    teams.push([pools.Frontend[i], pools.Backend[i], pools.Designer[i]]);
  }

  const remaining = [
    ...pools.Frontend.slice(balancedCount),
    ...pools.Backend.slice(balancedCount),
    ...pools.Designer.slice(balancedCount),
    ...unclassified,
  ];

  // No balanced teams possible — fall back to flexible grouping
  if (teams.length === 0) {
    const all = filtered.map(p => ({
      id: p.id, name: p.name, email: p.email,
      college: normalizeCollege(p.college),
      skill: normalizeSkill(p.skill) || p.skill || "General",
    }));
    for (let i = 0; i < all.length; i += teamSize) {
      const chunk = all.slice(i, i + teamSize);
      if (chunk.length > 0) teams.push(chunk);
    }
    return {
      teams: teams.filter(t => t.length > 0),
      overflowParticipants: [],
      maxTeams: teams.length,
      successfulSwaps: 0,
      relaxedDiversityConstraint: true,
    };
  }

  // Put overflow into extra teams
  for (let i = 0; i < remaining.length; i += teamSize) {
    const chunk = remaining.slice(i, i + teamSize);
    if (chunk.length === teamSize) teams.push(chunk);
  }

  const trueOverflow = remaining.length % teamSize !== 0
    ? remaining.slice(Math.floor(remaining.length / teamSize) * teamSize)
    : [];

  // Diversity optimization
  let swaps = 0;
  if (collegeDiversity !== "none") {
    for (let attempt = 0; attempt < retryLimit; attempt++) {
      const dups = teams.reduce((s, t) => s + teamPenalty(t), 0);
      if (dups === 0) break;
      if (!tryImproveDiversity(teams)) break;
      swaps++;
    }
  }

  return {
    teams,
    overflowParticipants: trueOverflow,
    maxTeams: teams.length,
    successfulSwaps: swaps,
    relaxedDiversityConstraint: balancedCount === 0,
  };
}

async function fetchUnassignedParticipants(eventId) {
  let lockedEmails = [];
  try {
    const lockedMembers = await prisma.teamMember.findMany({
      where: { team: { status: "PUBLISHED", eventId } },
      select: { email: true },
    });
    lockedEmails = lockedMembers.map(m => m.email).filter(Boolean);
  } catch { lockedEmails = []; }

  const participants = await prisma.participant.findMany({
    where: {
      eventId,
      ...(lockedEmails.length > 0 ? { email: { notIn: lockedEmails } } : {}),
    },
    orderBy: { name: "asc" },
  });
  return { participants, lockedCount: lockedEmails.length };
}

function mapTeamResponse(team) {
  const members = (team.members || []).map(m => ({
    id: m.id, name: m.name,
    email: m.email || "",
    college: m.college || "",
    skill: m.skill || "",
  }));
  return {
    id: team.id, name: team.name, status: team.status,
    rationale: team.aiRationale, createdAt: team.createdAt, members,
  };
}

// GET /api/admin/teams
router.get("/teams", async (req, res) => {
  try {
    const statusParam = String(req.query.status || "").trim().toUpperCase();
    const eventId = req.query?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const whereClause = {
      eventId,
      ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
    };
    const teams = await prisma.team.findMany({
      where: whereClause,
      include: { members: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, teams: teams.map(mapTeamResponse) });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch teams", error: error.message });
  }
});

// POST /api/admin/generate-teams
router.post("/generate-teams", async (req, res) => {
  try {
    const eventId = req.body?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const teamSize = Number.isFinite(Number(req.body?.teamSize)) ? Math.max(2, Number(req.body.teamSize)) : 3;
    const retryLimit = Number.isFinite(Number(req.body?.retryLimit)) ? Math.max(1, Number(req.body.retryLimit)) : DEFAULT_RETRY_LIMIT;

    const rules = {
      teamSize,
      retryLimit,
      skillBalance: req.body?.skillBalance || "strict",
      collegeDiversity: req.body?.collegeDiversity || "best_effort",
      experienceGrouping: req.body?.experienceGrouping || "none",
      excludeTags: Array.isArray(req.body?.excludeTags) ? req.body.excludeTags : [],
    };

    const { participants, lockedCount } = await fetchUnassignedParticipants(eventId);

    if (!participants.length) {
      return res.status(400).json({
        success: false,
        message: `No unassigned participants found. ${lockedCount} already in published teams.`,
      });
    }
    if (participants.length < teamSize) {
      return res.status(400).json({
        success: false,
        message: `Not enough participants. Need ${teamSize}, have ${participants.length}.`,
      });
    }

    const generated = buildTeams(participants, rules);

    if (generated.maxTeams === 0) {
      return res.status(400).json({ success: false, message: "Could not form any teams." });
    }

    // Delete old drafts
    // Delete old drafts for THIS event only
    const oldDrafts = await prisma.team.findMany({
      where: { status: "DRAFT", eventId },
      select: { id: true },
    });
    if (oldDrafts.length > 0) {
      await prisma.teamMember.deleteMany({ where: { teamId: { in: oldDrafts.map(t => t.id) } } });
      await prisma.team.deleteMany({ where: { id: { in: oldDrafts.map(t => t.id) } } });
    }

    // Create new draft teams for THIS event
    for (let idx = 0; idx < generated.teams.length; idx++) {
      const teamMembers = generated.teams[idx];
      const team = await prisma.team.create({
        data: {
          eventId,
          name: `Team ${String(idx + 1).padStart(2, "0")}`,
          status: "DRAFT",
        },
      });
      for (const member of teamMembers) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            name: member.name || "",
            email: member.email || "",
            skill: member.skill || "",
            college: member.college || "",
          },
        });
      }
    }

    const persistedTeams = await prisma.team.findMany({
      where: { status: "DRAFT", eventId },
      include: { members: true },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      message: `${persistedTeams.length} draft team(s) generated`,
      teams: persistedTeams.map(mapTeamResponse),
      meta: {
        rules,
        successfulSwaps: generated.successfulSwaps,
        relaxedDiversityConstraint: generated.relaxedDiversityConstraint,
        unassignedParticipants: generated.overflowParticipants.map(toParticipantView),
      },
    });
  } catch (error) {
    console.error("Team generation failed:", error);
    return res.status(500).json({ success: false, message: "Failed to generate teams", error: error.message });
  }
});
router.patch("/teams/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status required"
      });
    }

    const updatedTeam = await prisma.team.update({
      where: {
        id: req.params.id
      },
      data: {
        status
      }
    });

    return res.json({
      success: true,
      team: updatedTeam
    });
  } catch (error) {
    console.error("Status update failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update team status"
    });
  }
});
// POST /api/admin/approve-publish-teams
router.post("/approve-publish-teams", async (req, res) => {
  try {
    const eventId = req.body?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const draftTeams = await prisma.team.findMany({ where: { status: "DRAFT", eventId } });
    if (draftTeams.length === 0) {
      return res.status(400).json({ success: false, message: "No draft teams to approve." });
    }
    const updated = await prisma.team.updateMany({
      where: { status: "DRAFT", eventId },
      data: { status: "PUBLISHED" },
    });
    await prisma.participant.updateMany({
      where: { eventId, stage: "roster" },
      data: { stage: "development" },
    });
    try {
      await prisma.emailLog.create({
        data: {
          jobId: `approval_${Date.now()}`,
          recipientId: "system",
          recipientEmail: "system@internal",
          recipientName: "System",
          emailType: "team_approval",
          status: "COMPLETED",
        },
      });
    } catch {}
    return res.json({ success: true, message: `${updated.count} teams published`, publishedCount: updated.count });
  } catch (error) {
    console.error('[Approve Publish Teams Error]', error);
    return res.status(500).json({ success: false, message: "Failed to publish teams", error: error.message });
  }
});

// GET /api/admin/activity-log
router.get('/activity-log', async (req, res) => {
  try {
    const evaluations = await prisma.evaluation.findMany({
      take: 20, orderBy: { submittedAt: 'desc' },
      include: { judge: true, team: true },
    });
    const evalLogs = evaluations.map(e => ({
      id: e.id, action: 'score_submitted',
      details: `${e.judge.name} scored ${e.team.name}: ${e.scoreCode}/10`,
      created_at: e.submittedAt,
    }));
    let emailLogs = [];
    try {
      const emails = await prisma.emailLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
      emailLogs = emails.map(e => ({
        id: `email_${e.id}`, action: e.emailType,
        details: `Email '${e.emailType}' ${e.status.toLowerCase()} → ${e.recipientEmail}`,
        created_at: e.createdAt,
      }));
    } catch {}
    const all = [...evalLogs, ...emailLogs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30);
    return res.json({ logs: all });
  } catch { return res.json({ logs: [] }); }
});

// GET /api/admin/stages
router.get('/stages', async (req, res) => {
  try {
    const participants = await prisma.participant.findMany({ select: { stage: true } });
    const counts = {};
    participants.forEach(p => {
      const s = p.stage || 'roster';
      counts[s] = (counts[s] || 0) + 1;
    });
    return res.json({ stages: Object.entries(counts).map(([stage, count]) => ({ stage, count })) });
  } catch { return res.json({ stages: [] }); }
});

// POST /api/admin/advance-stage
router.post('/advance-stage', async (req, res) => {
  try {
    const { from_stage, to_stage } = req.body;
    const result = await prisma.participant.updateMany({
      where: { stage: from_stage },
      data: { stage: to_stage },
    });
    return res.json({ success: true, affected: result.count });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/admin/scores/:teamId
router.get('/scores/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const evals = await prisma.evaluation.findMany({
      where: { teamId, discarded: false },
      include: { judge: true },
    });
    const scores = evals.map(e => ({
      id: e.id,
      judge_name: e.judge.name,
      score: e.overrideScore !== null ? e.overrideScore : e.scoreCode,
      innovation: e.scoreInnovation,
      presentation: e.scorePresentaion,
    }));
    const avg = scores.length > 0
      ? scores.reduce((s, e) => s + e.score, 0) / scores.length
      : 0;

    const dbAnomalies = await prisma.anomalyFlag.findMany({
      where: { teamId, status: 'PENDING' },
      include: { judge: true },
    });
    const anomalies = dbAnomalies.map(a => ({
      id: a.id,
      judge_name: a.judge.name,
      score: a.newScore,
      panel_average: a.panelAvg,
      deviation: a.deviation,
      llmExplanation: a.llmExplanation,
    }));

    return res.json({ scores, average: avg, anomalies });
  } catch { return res.json({ scores: [], average: 0, anomalies: [] }); }
});

// POST /api/admin/anomalies/:id/:action
router.post('/anomalies/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    const { overrideScore } = req.body;

    const anomaly = await prisma.anomalyFlag.findUnique({ where: { id } });
    if (!anomaly) return res.status(404).json({ success: false, message: 'Anomaly not found' });

    let resolution = 'accepted';
    if (action === 'decline') {
      resolution = 'discarded';
      const ev = await prisma.evaluation.findUnique({
        where: { judgeId_teamId: { judgeId: anomaly.judgeId, teamId: anomaly.teamId } },
      });
      if (ev) {
        await prisma.evaluation.update({ where: { id: ev.id }, data: { discarded: true } });
      }
    } else if (action === 'override') {
      resolution = 'overridden';
      const ev = await prisma.evaluation.findUnique({
        where: { judgeId_teamId: { judgeId: anomaly.judgeId, teamId: anomaly.teamId } },
      });
      if (ev) {
        await prisma.evaluation.update({
          where: { id: ev.id },
          data: { scoreCode: Number(overrideScore), overrideScore: Number(overrideScore) },
        });
      }
    }

    await prisma.anomalyFlag.update({
      where: { id },
      data: { status: 'RESOLVED', resolution },
    });

    return res.json({ success: true, resolution });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const eventId = req.query?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const teams = await prisma.team.findMany({
      where: { status: 'PUBLISHED', eventId },
      include: { evaluations: true, members: true },
    });
    const ranked = teams.map(t => {
      const evals = t.evaluations || [];
      const avgCode = evals.length ? evals.reduce((s, e) => s + (e.scoreCode || 0), 0) / evals.length : 0;
      const avgInno = evals.length ? evals.reduce((s, e) => s + (e.scoreInnovation || 0), 0) / evals.length : 0;
      const avgPres = evals.length ? evals.reduce((s, e) => s + (e.scorePresentaion || 0), 0) / evals.length : 0;
      const total = (avgCode + avgInno + avgPres) / 3;
      return {
        id: t.id, name: t.name,
        score: Math.round(total * 10) / 10,
        code: Math.round(avgCode * 10) / 10,
        innovation: Math.round(avgInno * 10) / 10,
        presentation: Math.round(avgPres * 10) / 10,
        judgeCount: evals.length,
        members: t.members.map(m => ({ name: m.name, skill: m.skill })),
      };
    }).sort((a, b) => b.score - a.score);
    return res.json({ success: true, leaderboard: ranked });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/admin/pending-approvals
router.get('/pending-approvals', async (req, res) => {
  try {
    const eventId = req.query?.eventId;
    if (!eventId) return res.json({ draftTeams: 0, anomalies: 0, total: 0 });

    const draftTeams = await prisma.team.count({ where: { status: 'DRAFT', eventId } });
    const anomalies = await prisma.anomalyFlag.count({ where: { status: 'PENDING', eventId } });
    return res.json({ draftTeams, anomalies, total: draftTeams + anomalies });
  } catch { return res.json({ draftTeams: 0, anomalies: 0, total: 0 }); }
});
export default router;