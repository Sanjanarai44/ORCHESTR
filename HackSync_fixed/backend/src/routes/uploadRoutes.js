import express from "express";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { emailQueue } from "../queues/emailQueue.js";

const router = express.Router();

function normalizeSkill(skill) {
  const v = String(skill || "").trim().toLowerCase();
  if (["frontend","fe","front-end","ui","dev","developer","fullstack","react","vue"].includes(v) || v.includes("front") || v === "dev") return "Frontend";
  if (["backend","be","back-end","api","pm","system design"].includes(v) || v.includes("back") || v === "pm") return "Backend";
  if (["designer","design","ui/ux","ux","figma","graphic"].includes(v) || v.includes("design") || v.includes("ux")) return "Designer";
  return skill || "Frontend";
}

const upload = multer({ dest: "uploads/" });

// POST /api/admin/upload-roster
router.post("/upload-roster", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const eventId = req.body?.eventId || req.query?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on("data", (data) => results.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    let count = 0;
    for (const row of results) {
      if (!row.email) continue;
      const skill = normalizeSkill(row.skill || row.role || "Frontend");
      const participant = await prisma.participant.upsert({
        where: { eventId_email: { eventId, email: row.email.trim() } },
        update: {
          name: row.name?.trim(),
          college: (row.college || row.institution || "").trim(),
          skill,
        },
        create: {
          eventId,
          name: row.name?.trim() || "",
          email: row.email.trim(),
          college: (row.college || row.institution || "").trim(),
          skill,
        },
      });
      
      count++;
    }

    try { fs.unlinkSync(req.file.path); } catch {}
    return res.json({ success: true, message: "CSV uploaded", count });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
});

// GET /api/admin/participants?eventId=xxx
router.get("/participants", async (req, res) => {
  try {
    const eventId = req.query?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const participants = await prisma.participant.findMany({
      where: { eventId },
      orderBy: { name: "asc" },
    });

    const teams = await prisma.team.findMany({
      where: { eventId },
      include: { members: true }
    });

    const emailToTeamMap = {};
    for (const t of teams) {
      for (const m of t.members) {
        if (m.email) {
          emailToTeamMap[m.email.toLowerCase()] = {
            teamName: t.name,
            teamStatus: t.status
          };
        }
      }
    }

    return res.json({
      success: true,
      data: participants.map(p => {
        const token = jwt.sign({ participantId: p.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?participantToken=${token}`;
        const teamInfo = emailToTeamMap[p.email.toLowerCase()] || { teamName: null, teamStatus: null };
        return {
          id: p.id, name: p.name, email: p.email,
          college: p.college, skill: p.skill,
          stage: p.stage || "roster",
          createdAt: p.createdAt,
          magicLink,
          teamName: teamInfo.teamName, teamStatus: teamInfo.teamStatus,
        };
      }),
      participants: participants.map(p => {
        const token = jwt.sign({ participantId: p.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?participantToken=${token}`;
        const teamInfo = emailToTeamMap[p.email.toLowerCase()] || { teamName: null, teamStatus: null };
        return {
          id: p.id, name: p.name, email: p.email,
          college: p.college, skill: p.skill,
          stage: p.stage || "roster",
          createdAt: p.createdAt,
          magicLink,
          teamName: teamInfo.teamName, teamStatus: teamInfo.teamStatus,
        };
      }),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch participants", error: error.message });
  }
});

// GET /api/admin/participants/by-email/:email?eventId=xxx
router.get("/participants/by-email/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    const eventId = req.query?.eventId;
    const where = eventId
      ? { eventId, email: { equals: email, mode: "insensitive" } }
      : { email: { equals: email, mode: "insensitive" } };
    const participant = await prisma.participant.findFirst({ where });
    if (!participant) return res.json({ found: false, error: "Participant not found" });
    return res.json({ found: true, participant: { ...participant, stage: participant.stage || "roster" } });
  } catch (error) {
    return res.status(500).json({ found: false, error: error.message });
  }
});

// GET /api/admin/participants/:id
router.get("/participants/:id", async (req, res) => {
  try {
    const participant = await prisma.participant.findUnique({ where: { id: req.params.id } });
    if (!participant) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({
      success: true,
      participant: { ...participant, stage: participant.stage || "roster" },
      timeline: [],
      notifications: [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/participants
router.post("/participants", async (req, res) => {
  try {
    const { name, email, skill, college, institution, eventId } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: "name and email required" });
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });
    const participant = await prisma.participant.create({
      data: {
        eventId,
        name: name.trim(),
        email: email.trim(),
        skill: normalizeSkill(skill),
        college: (college || institution || "").trim(),
      },
    });
    return res.json({ success: true, message: "Participant added", data: participant });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ success: false, message: "Email already exists for this event" });
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/participants/:id
router.delete("/participants/:id", async (req, res) => {
  try {
    await prisma.participant.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/participants/:id
router.put("/participants/:id", async (req, res) => {
  try {
    const { name, email, skill, institution, college } = req.body;
    const participant = await prisma.participant.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.trim() }),
        ...(skill && { skill: normalizeSkill(skill) }),
        ...((institution || college) && { college: (institution || college).trim() }),
      },
    });
    return res.json({ success: true, message: "Participant updated", data: participant });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ success: false, message: "Email already exists" });
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/upload-judges
router.post("/upload-judges", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const eventId = req.body?.eventId || req.query?.eventId;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required" });

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on("data", (data) => results.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    let count = 0;
    for (const row of results) {
      if (!row.email) continue;
      await prisma.judge.upsert({
        where: { eventId_email: { eventId, email: row.email.trim() } },
        update: { name: row.name?.trim() || "" },
        create: { eventId, name: row.name?.trim() || "", email: row.email.trim() },
      });
      count++;
    }

    try { fs.unlinkSync(req.file.path); } catch {}
    return res.json({ success: true, message: "CSV uploaded", count });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
});

// GET /api/admin/events
router.get("/events", async (req, res) => {
  try {
    const organizerId = req.query?.organizer_id || req.query?.organizerId || "1";
    const events = await prisma.event.findMany({
      where: { organizerId: String(organizerId) },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      success: true,
      // AFTER
events: await Promise.all(events.map(async e => {
  const [participant_count, team_count] = await Promise.all([
    prisma.participant.count({ where: { eventId: e.id } }),
    prisma.team.count({ where: { eventId: e.id } }),
  ]);
  return {
    id: e.id,
    name: e.name,
    event_type: e.eventType,
    status: e.status,
    config: typeof e.config === "string" ? JSON.parse(e.config) : e.config,
    created_at: e.createdAt,
    participant_count,
    team_count,
  };
})),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/events
router.post("/events", async (req, res) => {
  try {
    const { organizer_id, organizerId, config, name } = req.body;
    const oid = String(organizer_id || organizerId || "1");
    const cfg = config || {};
    const event = await prisma.event.create({
      data: {
        organizerId: oid,
        name: name || cfg.event_name || "New Event",
        eventType: cfg.event_type || "general",
        status: "active",
        config: JSON.stringify(cfg),
      },
    });
    return res.json({ success: true, event_id: event.id, id: event.id, name: event.name });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/events/:id
router.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all nested entity IDs
    const teams = await prisma.team.findMany({ where: { eventId: id }, select: { id: true } });
    const teamIds = teams.map(t => t.id);
    
    const judges = await prisma.judge.findMany({ where: { eventId: id }, select: { id: true } });
    const judgeIds = judges.map(j => j.id);
    
    const participants = await prisma.participant.findMany({ where: { eventId: id }, select: { id: true } });
    const participantIds = participants.map(p => p.id);
    
    const recipientIds = [...judgeIds, ...participantIds, `system_${id}`];

    if (teamIds.length > 0) {
      await prisma.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
      await prisma.evaluation.deleteMany({ where: { teamId: { in: teamIds } } });
      await prisma.anomalyFlag.deleteMany({ where: { teamId: { in: teamIds } } });
      await prisma.mentorConversation.deleteMany({ where: { teamId: { in: teamIds } } });
      await prisma.team.deleteMany({ where: { eventId: id } });
    }

    if (judgeIds.length > 0) {
      await prisma.eventSettings.deleteMany({
        where: { key: { in: judgeIds.map(jid => `calibration_summary_${jid}`) } }
      });
    }

    if (recipientIds.length > 0) {
      await prisma.aiEmailContent.deleteMany({ where: { recipientId: { in: recipientIds } } });
      await prisma.emailLog.deleteMany({ where: { recipientId: { in: recipientIds } } });
    }

    await prisma.eventSettings.deleteMany({ where: { key: { startsWith: `${id}_` } } });
    
    await prisma.judge.deleteMany({ where: { eventId: id } });
    await prisma.participant.deleteMany({ where: { eventId: id } });
    await prisma.event.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;