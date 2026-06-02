import express from 'express';
import jwt from 'jsonwebtoken';
import { emailQueue } from '../queues/emailQueue.js';
import prisma from '../config/prisma.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET not set. Judge magic links will be broken.');
}

// GET /api/admin/judges
router.get('/judges', async (req, res) => {
  try {
    const judges = await prisma.judge.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, judges });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch judges' });
  }
});



// DELETE /api/admin/judges/:id
router.delete('/judges/:id', async (req, res) => {
  try {
    await prisma.judge.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete judge' });
  }
});

// POST /api/admin/assign-judges
router.post('/assign-judges', async (req, res) => {
  try {
    const judges = await prisma.judge.findMany();
    const teams = await prisma.team.findMany({ where: { status: 'PUBLISHED' } });

    if (judges.length === 0) return res.status(404).json({ success: false, message: 'No judges found' });
    if (teams.length === 0) return res.status(404).json({ success: false, message: 'No published teams found. Approve and publish teams first.' });

    // New Assignment Logic: 3 judges per team, round-robin
    const assignments = {};
    judges.forEach(j => (assignments[j.id] = []));
    
    let judgeIdx = 0;
    const targetJudgesPerTeam = Math.min(3, judges.length);

    for (const team of teams) {
      for (let i = 0; i < targetJudgesPerTeam; i++) {
        const jId = judges[judgeIdx].id;
        assignments[jId].push(team.id);
        judgeIdx = (judgeIdx + 1) % judges.length;
      }
    }

    for (const judge of judges) {
      await prisma.judge.update({
        where: { id: judge.id },
        data: { assignedTeams: JSON.stringify(assignments[judge.id]) },
      });
    }

    return res.json({ 
      success: true, 
      message: `Teams assigned (${targetJudgesPerTeam} per team) to ${judges.length} judges`, 
      judgeCount: judges.length, 
      teamCount: teams.length 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to assign teams' });
  }
});

// POST /api/admin/send-judge-links
router.post('/send-judge-links', async (req, res) => {
  try {
    const judges = await prisma.judge.findMany();
    if (judges.length === 0) return res.status(404).json({ success: false, message: 'No judges found' });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    let sentCount = 0;

    for (const judge of judges) {
      const token = jwt.sign(
        { judgeId: judge.id, eventId: 'event_1' },
        JWT_SECRET,
        { expiresIn: '48h' }
      );

      await prisma.judge.update({
        where: { id: judge.id },
        data: { jwtToken: token, tokenUsed: false },
      });

      const magicLink = `${frontendUrl}/?token=${token}`;
      const jobId = `magic_link_${judge.id}_${Date.now()}`;

      try {
        await prisma.emailLog.create({
          data: {
            jobId,
            recipientId: judge.id,
            recipientEmail: judge.email,
            recipientName: judge.name,
            emailType: 'magic_link',
            status: 'PENDING',
          },
        });
      } catch {}

      try {
        await emailQueue.add('send_email', {
          recipientId: judge.id,
          recipientEmail: judge.email,
          recipientName: judge.name,
          emailType: 'magic_link',
          templateData: { judgeName: judge.name, magicLink, expiryHours: 48 },
        }, { jobId });
      } catch (qErr) {
        console.error(`[send-judge-links] Queue error for ${judge.email}:`, qErr.message);
      }

      sentCount++;
    }

    return res.json({ success: true, sentCount, message: `Links sent to ${sentCount} judges` });
  } catch (error) {
    console.error('[AdminJudgesRoutes] Error sending judge links:', error);
    return res.status(500).json({ success: false, error: 'Failed to send magic links' });
  }
});

// POST /api/admin/send-participant-emails
router.post('/send-participant-emails', async (req, res) => {
  try {
    const { emailType = 'welcome' } = req.body;
    // FIXED: members: true — no participant relation in TeamMember
    const teams = await prisma.team.findMany({
      where: { status: 'PUBLISHED' },
      include: { members: true },
    });

    if (teams.length === 0) {
      return res.status(400).json({ success: false, message: 'No published teams found.' });
    }

    let sentCount = 0;
    for (const team of teams) {
      for (const member of team.members) {
        if (!member?.email) continue;
        const jobId = `participant_${emailType}_${member.id}_${Date.now()}`;

        try {
          await prisma.emailLog.create({
            data: {
              jobId,
              recipientId: member.id,
              recipientEmail: member.email,
              recipientName: member.name,
              emailType,
              status: 'PENDING',
            },
          });
        } catch {}

        try {
          await emailQueue.add('send_email', {
            recipientId: member.id,
            recipientEmail: member.email,
            recipientName: member.name,
            emailType,
            templateData: {
              participantName: member.name,
              teamName: team.name,
              teamMembers: team.members.map(m => m.name),
            },
          }, { jobId });
        } catch (qErr) {
          console.error(`Queue error for ${member.email}:`, qErr.message);
        }
        sentCount++;
      }
    }

    return res.json({ success: true, sentCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;