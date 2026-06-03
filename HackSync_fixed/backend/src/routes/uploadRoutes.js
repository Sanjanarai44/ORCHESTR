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
  return skill || "Frontend"; // keep original, don't block
}

const upload = multer({ dest: "uploads/" });

// POST /api/admin/upload-roster
router.post("/upload-roster", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

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
        where: { email: row.email.trim() },
        update: { name: row.name?.trim(), college: (row.college || row.institution || "").trim(), skill },
        create: { name: row.name?.trim() || "", email: row.email.trim(), college: (row.college || row.institution || "").trim(), skill },
      });
      
      // Generate magic link and queue email
      const token = jwt.sign({ participantId: participant.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
      const portalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?participantToken=${token}`;
      
      const emailLog = await prisma.emailLog.create({
        data: {
          recipientId: participant.id,
          recipientEmail: participant.email,
          recipientName: participant.name,
          emailType: 'magic_link',
          status: 'PENDING'
        }
      });
      
      await emailQueue.add('send_email', {
        type: 'magic_link',
        recipientId: participant.id,
        email: participant.email,
        name: participant.name,
        link: portalLink,
        logId: emailLog.id
      }, { jobId: `magic_link_participant_${participant.id}_${Date.now()}` });

      count++;
    }

    try { fs.unlinkSync(req.file.path); } catch {}
    return res.json({ success: true, message: "CSV uploaded", count });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
});

// GET /api/admin/participants
router.get("/participants", async (req, res) => {
  try {
    // Try with TeamMember relation first, fall back to simple query
    let participants;
    try {
      participants = await prisma.participant.findMany({
        include: { teamEntry: { include: { team: true } } },
        orderBy: { name: "asc" },
      });
      return res.json({
        success: true,
        data: participants.map(p => ({
          id: p.id, name: p.name, email: p.email,
          college: p.college, skill: p.skill, stage: p.stage,
          createdAt: p.createdAt,
          teamName: p.teamEntry?.team?.name || null,
          teamStatus: p.teamEntry?.team?.status || null,
        })),
      });
    } catch {
      // TeamMember relation not available yet — return without team info
      participants = await prisma.participant.findMany({ orderBy: { name: "asc" } });
      return res.json({
        success: true,
        data: participants.map(p => ({
          id: p.id, name: p.name, email: p.email,
          college: p.college, skill: p.skill, stage: p.stage || "roster",
          createdAt: p.createdAt, teamName: null, teamStatus: null,
        })),
      });
    }
  } catch (error) {
    console.error("Database fetch error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve directory records", error: error.message });
  }
});

// GET /api/admin/participants/by-email/:email
router.get("/participants/by-email/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    const participant = await prisma.participant.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
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
    return res.json({ success: true, participant: { ...participant, stage: participant.stage || "roster" }, timeline: [], notifications: [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/participants
router.post("/participants", async (req, res) => {
  try {
    const { name, email, skill, college, institution } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: "name and email required" });
    const participant = await prisma.participant.create({
      data: { name: name.trim(), email: email.trim(), skill: normalizeSkill(skill), college: (college || institution || "").trim() },
    });
    return res.json({ success: true, message: "Participant added", data: participant });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ success: false, message: "Email already exists" });
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/participants/:id
router.delete("/participants/:id", async (req, res) => {
  try {
    // Delete TeamMember first if exists
    try { await prisma.teamMember.deleteMany({ where: { participantId: req.params.id } }); } catch {}
    await prisma.participant.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
// POST /api/admin/upload-judges
router.post("/upload-judges", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

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
        where: { email: row.email.trim() },
        update: { name: row.name?.trim() || "" },
        create: { name: row.name?.trim() || "", email: row.email.trim() },
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

export default router;