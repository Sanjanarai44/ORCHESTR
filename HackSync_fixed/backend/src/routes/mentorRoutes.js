import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get mentor session init state (history, problem description, session notes)
router.get('/init', async (req, res) => {
  const { teamId, participantId } = req.query;

  try {
    // History
    let history = [];
    if (participantId && participantId !== 'demo') {
      history = await prisma.mentorConversation.findMany({
        where: { teamId, participantId },
        orderBy: { timestamp: 'asc' },
      });
    } else {
      // Fallback for demo or if no participantId provided
      history = await prisma.mentorConversation.findMany({
        where: { teamId, participantId: null },
        orderBy: { timestamp: 'asc' },
      });
    }

    // Problem description from team
    let problem_description = '';
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { problemStatement: true },
    });
    if (team) {
      problem_description = team.problemStatement || '';
    }

    // Session notes from participant
    let session_notes = '';
    if (participantId && participantId !== 'demo') {
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        select: { sessionNotes: true },
      });
      if (participant) {
        session_notes = participant.sessionNotes || '';
      }
    }

    res.json({
      history,
      problem_description,
      session_notes,
    });
  } catch (error) {
    console.error('Error fetching mentor init:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save a mentor message
router.post('/message', async (req, res) => {
  const { teamId, participantId, role, content } = req.body;

  try {
    const newMessage = await prisma.mentorConversation.create({
      data: {
        teamId,
        participantId: (participantId && participantId !== 'demo') ? participantId : null,
        role,
        content,
      },
    });
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error saving mentor message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update context (problem description or session notes)
router.post('/context', async (req, res) => {
  const { teamId, participantId, problem_description, session_notes } = req.body;

  try {
    if (problem_description !== undefined && problem_description !== null) {
      await prisma.team.update({
        where: { id: teamId },
        data: { problemStatement: problem_description },
      });
    }

    if (session_notes !== undefined && session_notes !== null && participantId && participantId !== 'demo') {
      await prisma.participant.update({
        where: { id: participantId },
        data: { sessionNotes: session_notes },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating mentor context:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
