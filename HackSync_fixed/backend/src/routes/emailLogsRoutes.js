import express from 'express';
import prisma from '../config/prisma.js';
import { emailQueue } from '../queues/emailQueue.js';

const router = express.Router();

// GET /api/admin/emails
router.get('/', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, error: 'eventId is required' });

    const judges = await prisma.judge.findMany({ where: { eventId }, select: { id: true } });
    const participants = await prisma.participant.findMany({ where: { eventId }, select: { id: true } });
    const recipientIds = [...judges.map(j => j.id), ...participants.map(p => p.id), `system_${eventId}`];

    const logs = await prisma.emailLog.findMany({
      where: { recipientId: { in: recipientIds } },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 for dashboard
    });
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('[EmailLogsRoutes] Error fetching email logs:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch email logs' });
  }
});

// POST /api/admin/emails/:id/retry
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the failed email log
    const log = await prisma.emailLog.findUnique({
      where: { id }
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Email log not found' });
    }

    if (log.status !== 'FAILED') {
      return res.status(400).json({ success: false, message: 'Can only retry failed emails' });
    }

    // Reset status to PENDING
    await prisma.emailLog.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMessage: null
      }
    });

    // We don't have the full original payload since we only log basic info.
    // In a real app we'd fetch the Judge/Participant details again,
    // or store the raw payload in EmailLog. Since we only support magic_link for now:
    if (log.emailType === 'magic_link') {
      const judge = await prisma.judge.findUnique({ where: { id: log.recipientId } });
      if (judge && judge.jwtToken) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const magicLink = `${frontendUrl}/?token=${judge.jwtToken}`;
        
        await emailQueue.add('send_email', {
          recipientId: judge.id,
          recipientEmail: judge.email,
          recipientName: judge.name,
          emailType: 'magic_link',
          templateData: {
            judgeName: judge.name,
            magicLink: magicLink,
            expiryHours: 48
          }
        }, { jobId: log.jobId || undefined });
      }
    }

    return res.status(200).json({ success: true, message: 'Retry job queued' });

  } catch (error) {
    console.error('[EmailLogsRoutes] Error retrying email:', error);
    return res.status(500).json({ success: false, error: 'Failed to retry email' });
  }
});

export default router;
