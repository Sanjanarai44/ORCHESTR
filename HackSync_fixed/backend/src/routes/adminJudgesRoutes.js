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
      // Check if link was already sent
      if (judge.jwtToken) {
        // Double check EmailLog
        const existingLog = await prisma.emailLog.findFirst({
          where: { recipientId: judge.id, emailType: 'magic_link', status: { in: ['SENT', 'PENDING', 'COMPLETED'] } }
        });
        if (existingLog) continue;
      }

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
    const teams = await prisma.team.findMany({
      where: { status: 'PUBLISHED' },
      include: { members: true },
    });

    if (teams.length === 0) {
      return res.status(400).json({ success: false, message: 'No published teams found.' });
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    let sentCount = 0;

    for (const team of teams) {
      for (const member of team.members) {
        if (!member?.email) continue;
        
        // Find corresponding participant to get ID
        const participant = await prisma.participant.findUnique({ where: { email: member.email } });
        if (!participant) continue;

        // Check if an email of this type was already sent to this participant
        const existingLog = await prisma.emailLog.findFirst({
          where: {
            recipientId: participant.id,
            emailType,
            status: { in: ['SENT', 'PENDING', 'COMPLETED'] }
          }
        });

        if (existingLog) continue; // Skip if already sent or queued

        const token = jwt.sign({ participantId: participant.id }, jwtSecret, { expiresIn: '30d' });
        const portalLink = `${frontendUrl}/?participantToken=${token}`;

        const jobId = `participant_${emailType}_${participant.id}_${Date.now()}`;

        let logId;
        try {
          const createdLog = await prisma.emailLog.create({
            data: {
              jobId,
              recipientId: participant.id,
              recipientEmail: participant.email,
              recipientName: participant.name,
              emailType,
              status: 'PENDING',
            },
          });
          logId = createdLog.id;
        } catch {}

        try {
          await emailQueue.add('send_email', {
            emailType,
            recipientId: participant.id,
            recipientEmail: participant.email,
            recipientName: participant.name,
            templateData: {
              participantName: participant.name,
              teamName: team.name,
              teammates: team.members.filter(m => m.id !== member.id).map(m => ({ name: m.name, email: m.email, skill: m.skill })),
              portalLink
            },
            logId
          }, { jobId });
        } catch (qErr) {
          console.error(`Queue error for ${participant.email}:`, qErr.message);
        }
        sentCount++;
      }
    }

    return res.json({ success: true, sentCount, message: `Emails queued for ${sentCount} participants` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;