import express from 'express';
import prisma from '../config/prisma.js';
import { anomalyQueue } from '../queues/anomalyQueue.js';

const router = express.Router();

// Helper to compute stats
async function getEvaluationsAndJudgeStats(eventId) {
  const allEvals = await prisma.evaluation.findMany({
    where: { discarded: false, team: { eventId } },
    include: { judge: true, team: true }
  });

  const judgeStats = {};
  let globalSum = 0;
  let globalCount = 0;

  allEvals.forEach(e => {
    if (!judgeStats[e.judgeId]) {
      judgeStats[e.judgeId] = {
        judge: e.judge,
        scores: [],
        evaluations: []
      };
    }
    const eff = e.overrideScore !== null ? e.overrideScore : (e.scoreCode + e.scoreInnovation + e.scorePresentaion) / 3;
    e.effectiveScore = eff;
    judgeStats[e.judgeId].scores.push(eff);
    judgeStats[e.judgeId].evaluations.push(e);
    
    globalSum += eff;
    globalCount++;
  });

  const globalAvg = globalCount > 0 ? globalSum / globalCount : 0.0;

  for (const jid in judgeStats) {
    const scores = judgeStats[jid].scores;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    let std = 0.0;
    if (scores.length >= 2) {
      const variance = scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (scores.length - 1);
      std = Math.sqrt(variance);
    }

    judgeStats[jid].mean = mean;
    judgeStats[jid].stdDev = std;
    
    let biasLabel = "Neutral";
    if (mean < globalAvg - 1.5) biasLabel = "Harsh";
    else if (mean > globalAvg + 1.5) biasLabel = "Lenient";
    judgeStats[jid].biasLabel = biasLabel;
  }

  return { allEvals, judgeStats, globalAvg, globalCount };
}

// ENDPOINT 1: GET /api/admin/calibration/judge-calibration-report
router.get('/judge-calibration-report', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });

    const { judgeStats, globalAvg, globalCount } = await getEvaluationsAndJudgeStats(eventId);

    const zscoreSetting = await prisma.eventSettings.findUnique({ where: { key: `${eventId}_zscore_normalisation_enabled` }});
    const zScoreNormalisationEnabled = zscoreSetting?.value === 'true';

    const judgeList = await prisma.judge.findMany({ where: { eventId } });
    const judges = [];

    for (const judge of judgeList) {
      const stats = judgeStats[judge.id];
      if (!stats) continue;

      const judgeStdFloor = Math.max(stats.stdDev, 1.5);

      const scoresByTeam = stats.evaluations.map(e => {
        const z = (e.effectiveScore - stats.mean) / judgeStdFloor;
        const normalised = Math.max(1.0, Math.min(10.0, 5.5 + z * 1.5));
        
        return {
          teamId: e.teamId,
          teamName: e.team.name,
          rawTotal: e.effectiveScore,
          normalisedScore: normalised,
          discarded: e.discarded,
          overridden: e.overrideScore !== null,
          overrideScore: e.overrideScore
        };
      });

      const anomalyCount = await prisma.anomalyFlag.count({ where: { judgeId: judge.id }});
      
      const summarySetting = await prisma.eventSettings.findUnique({ where: { key: `calibration_summary_${judge.id}` }});

      judges.push({
        judgeId: judge.id,
        judgeName: judge.name,
        judgeEmail: judge.email,
        avgScore: stats.mean,
        stdDev: stats.stdDev,
        biasLabel: stats.biasLabel,
        anomalyCount,
        scoresByTeam,
        llmSummary: summarySetting ? summarySetting.value : null
      });
    }

    const lastCheckObj = await prisma.eventSettings.findUnique({ where: { key: `${eventId}_last_anomaly_check_result` }});

    return res.json({
      success: true,
      globalAvg: Number(globalAvg.toFixed(2)),
      totalJudges: judges.length,
      totalEvaluations: globalCount,
      zScoreNormalisationEnabled: zScoreNormalisationEnabled,
      lastAnomalyCheckResult: lastCheckObj ? lastCheckObj.value : null,
      judges
    });

  } catch (error) {
    console.error('[Calibration] GET /judge-calibration-report error:', error);
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 2: POST /api/admin/calibration/judge-calibration-report/generate-summaries
router.post('/judge-calibration-report/generate-summaries', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });

    const { judgeStats, globalAvg } = await getEvaluationsAndJudgeStats(eventId);
    const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000';
    let generatedCount = 0;

    const promises = Object.entries(judgeStats).map(async ([jid, stats]) => {
      if (!stats.evaluations || stats.evaluations.length === 0) return;

      const scores_list = stats.evaluations.map(e => {
        return `${e.team.name}: ${e.effectiveScore.toFixed(2)}`;
      }).join(", ");

      try {
        const response = await fetch(`${AI_BACKEND_URL}/calibration-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: stats.judge.name,
            N: stats.evaluations.length,
            global_avg: globalAvg,
            avg: stats.mean,
            std_dev: stats.stdDev,
            bias_label: stats.biasLabel,
            scores_list
          })
        });

        if (response.ok) {
          const result = await response.json();
          const summary = result.summary;

          await prisma.eventSettings.upsert({
            where: { key: `calibration_summary_${jid}` },
            create: { key: `calibration_summary_${jid}`, value: summary },
            update: { value: summary }
          });
          generatedCount++;
        } else {
          console.error(`[Calibration] AI backend returned error for judge ${jid}: ${response.status}`);
        }
      } catch (err) {
        console.error(`[Calibration] Error calling AI backend for judge ${jid}:`, err.message);
      }
    });

    await Promise.all(promises);

    return res.json({ success: true, triggered: generatedCount, message: `Summaries generated successfully for ${generatedCount} judges.` });
  } catch (error) {
    console.error('[Calibration] POST /generate-summaries error:', error);
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 3: POST /api/admin/calibration/settings/zscore-normalisation
router.post('/settings/zscore-normalisation', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });
    const { enabled } = req.body;
    await prisma.eventSettings.upsert({
      where: { key: `${eventId}_zscore_normalisation_enabled` },
      create: { key: `${eventId}_zscore_normalisation_enabled`, value: enabled ? 'true' : 'false' },
      update: { value: enabled ? 'true' : 'false' }
    });
    return res.json({ success: true, zScoreNormalisationEnabled: Boolean(enabled) });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 4: GET /api/admin/calibration/settings/zscore-normalisation
router.get('/settings/zscore-normalisation', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });
    const setting = await prisma.eventSettings.findUnique({ where: { key: `${eventId}_zscore_normalisation_enabled` }});
    return res.json({ success: true, zScoreNormalisationEnabled: setting?.value === 'true' });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 4.1: POST /api/admin/calibration/settings/anomaly-threshold
router.post('/settings/anomaly-threshold', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });
    const { threshold } = req.body;
    await prisma.eventSettings.upsert({
      where: { key: `${eventId}_anomaly_threshold` },
      create: { key: `${eventId}_anomaly_threshold`, value: String(threshold) },
      update: { value: String(threshold) }
    });
    return res.json({ success: true, anomalyThreshold: Number(threshold) });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 4.2: GET /api/admin/calibration/settings/anomaly-threshold
router.get('/settings/anomaly-threshold', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });
    const setting = await prisma.eventSettings.findUnique({ where: { key: `${eventId}_anomaly_threshold` }});
    return res.json({ success: true, anomalyThreshold: setting ? parseFloat(setting.value) : 2.0 });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 5: GET /api/admin/calibration/leaderboard/comparison
router.get('/leaderboard/comparison', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });
    const { allEvals, judgeStats } = await getEvaluationsAndJudgeStats(eventId);
    
    const teams = await prisma.team.findMany({ where: { eventId, status: 'PUBLISHED' }});
    
    // RAW Leaderboard
    const rawScores = {};
    teams.forEach(t => rawScores[t.id] = { team: t, total: 0, count: 0 });
    
    allEvals.forEach(e => {
      if (rawScores[e.teamId]) {
        rawScores[e.teamId].total += e.effectiveScore;
        rawScores[e.teamId].count++;
      }
    });

    let rawLeaderboard = Object.values(rawScores).map(ts => ({
      teamId: ts.team.id,
      teamName: ts.team.name,
      total: ts.count > 0 ? ts.total / ts.count : 0,
      resultsHeld: ts.team.resultsHeld
    })).sort((a, b) => b.total - a.total);

    rawLeaderboard = rawLeaderboard.map((t, idx) => ({ ...t, rank: idx + 1 }));

    // NORMALISED Leaderboard
    const normScores = {};
    teams.forEach(t => normScores[t.id] = { team: t, total: 0, count: 0 });

    allEvals.forEach(e => {
      if (normScores[e.teamId]) {
        const stats = judgeStats[e.judgeId];
        const judgeStdFloor = Math.max(stats.stdDev, 1.5);
        const z = (e.effectiveScore - stats.mean) / judgeStdFloor;
        const normalised = Math.max(1.0, Math.min(10.0, 5.5 + z * 1.5));

        normScores[e.teamId].total += normalised;
        normScores[e.teamId].count++;
      }
    });

    let normalisedLeaderboard = Object.values(normScores).map(ts => ({
      teamId: ts.team.id,
      teamName: ts.team.name,
      total: ts.count > 0 ? ts.total / ts.count : 0,
      resultsHeld: ts.team.resultsHeld
    })).sort((a, b) => b.total - a.total);

    normalisedLeaderboard = normalisedLeaderboard.map((t, idx) => ({ ...t, rank: idx + 1 }));

    // Significant Changes
    const significantChanges = [];
    rawLeaderboard.forEach(rt => {
      const nt = normalisedLeaderboard.find(t => t.teamId === rt.teamId);
      if (nt) {
        const rankChange = rt.rank - nt.rank;
        if (Math.abs(rankChange) >= 1) {
          significantChanges.push({
            teamId: rt.teamId,
            teamName: rt.teamName,
            rawRank: rt.rank,
            normalisedRank: nt.rank,
            rankChange
          });
        }
      }
    });

    return res.json({
      success: true,
      rawLeaderboard,
      normalisedLeaderboard,
      significantChanges
    });
  } catch (error) {
    console.error('[Calibration] GET /leaderboard/comparison error:', error);
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// ENDPOINT 6: POST /api/admin/calibration/run-post-normalisation-check
router.post('/run-post-normalisation-check', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, detail: 'eventId is required' });
    await anomalyQueue.add('run_post_normalisation_anomaly_check', {
      taskName: 'run_post_normalisation_anomaly_check',
      eventId
    });
    return res.json({ success: true, triggered: true, message: 'Post-normalisation check queued successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

export default router;
