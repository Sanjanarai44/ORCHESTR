import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const router = express.Router();

const getJwtSecret = () => process.env.JWT_SECRET || 'secret';

function extractToken(req) {
  const { token } = req.query;
  if (token) return token;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.body?.token || null;
}

// GET /api/judge/verify?token=xxx
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, detail: 'Token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(401).json({
        success: false,
        detail: err.name === 'TokenExpiredError' ? 'Link expired' : 'Invalid or tampered link',
      });
    }

    const { judgeId } = decoded;
    const judge = await prisma.judge.findUnique({ where: { id: judgeId } });

    if (!judge) {
      return res.status(404).json({ success: false, detail: 'Judge not found' });
    }

    // Accept if token matches stored token OR if no token stored yet
    if (judge.jwtToken && judge.jwtToken !== token) {
      return res.status(401).json({ success: false, detail: 'A newer link has been issued. Please use the latest link from your email.' });
    }

    return res.status(200).json({
      success: true,
      sessionToken: token,
      judgeName: judge.name,
      judgeId: judge.id,
    });

  } catch (error) {
    console.error('[JudgeAuthRoutes] Error verifying token:', error);
    return res.status(500).json({ success: false, detail: 'Internal server error' });
  }
});

// GET /api/judge/teams
router.get('/teams', async (req, res) => {
  try {
    const actualToken = extractToken(req);
    if (!actualToken) return res.status(401).json({ success: false, detail: 'Token required' });

    let decoded;
    try {
      decoded = jwt.verify(actualToken, getJwtSecret());
    } catch (err) {
      return res.status(401).json({ success: false, detail: 'Invalid or expired token' });
    }

    const judge = await prisma.judge.findUnique({ where: { id: decoded.judgeId } });
    if (!judge) return res.status(404).json({ success: false, detail: 'Judge not found' });

    const assignedTeamIds = JSON.parse(judge.assignedTeams || '[]');

    // Fallback: if no teams assigned yet, return all published teams
    let teamIdList = assignedTeamIds;
    if (!teamIdList.length) {
      const allTeams = await prisma.team.findMany({ where: { status: 'PUBLISHED' }, select: { id: true } });
      teamIdList = allTeams.map(t => t.id);
    }

    const teams = await Promise.all(teamIdList.map(async (teamId) => {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: true,  // FIXED: no participant relation in TeamMember
          evaluations: { where: { judgeId: judge.id } },
        },
      });
      if (!team) return null;

      const eval_ = team.evaluations[0];
      return {
        id: team.id,
        name: team.name,
        rationale: team.aiRationale,
        scored: !!eval_,
        members: team.members.map(m => ({
          id: m.id,
          name: m.name,
          skill: m.skill,
          college: m.college,
          email: m.email,
        })),
        submittedScores: eval_ ? {
          code: eval_.scoreCode,
          innovation: eval_.scoreInnovation,
          presentation: eval_.scorePresentaion,
          starRating: eval_.starRating,
          comment: eval_.comment,
        } : null,
      };
    }));

    return res.json({ success: true, teams: teams.filter(Boolean), judgeName: judge.name });
  } catch (error) {
    console.error('[JudgeAuth] GET /teams error:', error);
    return res.status(500).json({ success: false, detail: 'Server error' });
  }
});

// POST /api/judge/evaluate
router.post('/evaluate', async (req, res) => {
  try {
    const actualToken = extractToken(req);
    if (!actualToken) return res.status(401).json({ success: false, detail: 'Token required' });

    let decoded;
    try {
      decoded = jwt.verify(actualToken, getJwtSecret());
    } catch {
      return res.status(401).json({ success: false, detail: 'Invalid token' });
    }

    const judge = await prisma.judge.findUnique({ where: { id: decoded.judgeId } });
    if (!judge) return res.status(404).json({ success: false, detail: 'Judge not found' });

    const { teamId, scoreCode, scoreInnovation, scorePresentation, scorePresentaion, starRating = 0, comment = '' } = req.body;
    const presentScore = Number(scorePresentation || scorePresentaion || scoreCode || 0);

    const evaluation = await prisma.evaluation.upsert({
      where: { judgeId_teamId: { judgeId: judge.id, teamId } },
      create: {
        judgeId: judge.id,
        teamId,
        scoreCode: Number(scoreCode),
        scoreInnovation: Number(scoreInnovation),
        scorePresentaion: presentScore,
        starRating: Number(starRating),
        comment: String(comment),
      },
      update: {
        scoreCode: Number(scoreCode),
        scoreInnovation: Number(scoreInnovation),
        scorePresentaion: presentScore,
        starRating: Number(starRating),
        comment: String(comment),
      },
    });

    // Anomaly detection
    const allEvals = await prisma.evaluation.findMany({ where: { teamId } });
    if (allEvals.length >= 3) {
      const avg = allEvals.reduce((s, e) => s + e.scoreCode, 0) / allEvals.length;
      const deviation = Math.abs(Number(scoreCode) - avg);
      
      const thresholdSetting = await prisma.eventSettings.findUnique({ where: { key: 'anomaly_threshold' }});
      const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 2.0;

      if (deviation > threshold) {
        await prisma.anomalyFlag.create({
          data: { teamId, judgeId: judge.id, newScore: Number(scoreCode), panelAvg: avg, deviation, status: 'PENDING' },
        });
      }
    }

    return res.json({ success: true, evaluation });
  } catch (error) {
    console.error('[JudgeAuth] POST /evaluate error:', error);
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// GET /api/judge/progress
router.get('/progress', async (req, res) => {
  try {
    const actualToken = extractToken(req);
    if (!actualToken) return res.status(401).json({ success: false });
    const decoded = jwt.verify(actualToken, getJwtSecret());
    const judge = await prisma.judge.findUnique({ where: { id: decoded.judgeId } });
    const assignedIds = JSON.parse(judge?.assignedTeams || '[]');
    const evaluated = await prisma.evaluation.count({ where: { judgeId: decoded.judgeId } });
    return res.json({
      success: true,
      total: assignedIds.length,
      evaluated,
      percent: assignedIds.length ? Math.round((evaluated / assignedIds.length) * 100) : 0,
    });
  } catch {
    return res.status(500).json({ success: false });
  }
});

export default router;