import { Worker } from 'bullmq';
import sharedRedis from '../config/sharedRedis.js';
import prisma from '../config/prisma.js';
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000';

const anomalyWorker = new Worker(
  'anomaly_queue',
  async (job) => {
    const { taskName, ...data } = job.data;

    console.log(`[AnomalyWorker] Processing job ${job.id}: ${taskName}`);

    if (taskName === 'generate_calibration_summary') {
      const { judgeId, global_avg } = data;
      
      const judge = await prisma.judge.findUnique({
        where: { id: judgeId },
        include: { evaluations: true }
      });

      if (!judge || !judge.evaluations.length) {
        return { success: false, reason: 'No judge or evaluations found' };
      }

      const nonDiscarded = judge.evaluations.filter(e => !e.discarded);
      if (!nonDiscarded.length) return { success: false, reason: 'No non-discarded evals' };

      const effectiveScores = nonDiscarded.map(e => {
        if (e.overrideScore !== null) return e.overrideScore;
        return (e.scoreCode + e.scoreInnovation + e.scorePresentaion) / 3;
      });

      const avg = effectiveScores.reduce((a, b) => a + b, 0) / effectiveScores.length;
      
      let std_dev = 0.0;
      if (effectiveScores.length >= 2) {
        const variance = effectiveScores.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / (effectiveScores.length - 1);
        std_dev = Math.sqrt(variance);
      }

      let bias_label = "Neutral";
      if (avg < global_avg - 1.5) bias_label = "Harsh";
      else if (avg > global_avg + 1.5) bias_label = "Lenient";

      // Build scores list text
      const teamIds = nonDiscarded.map(e => e.teamId);
      const teams = await prisma.team.findMany({ where: { id: { in: teamIds } }});
      const teamMap = {};
      teams.forEach(t => teamMap[t.id] = t.name);

      const scores_list = nonDiscarded.map((e, idx) => {
        const tName = teamMap[e.teamId] || `Team ${e.teamId}`;
        return `${tName}: ${effectiveScores[idx].toFixed(2)}`;
      }).join(", ");

      // Call AI Backend
      try {
        const response = await fetch(`${AI_BACKEND_URL}/calibration-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: judge.name,
            N: nonDiscarded.length,
            global_avg,
            avg,
            std_dev,
            bias_label,
            scores_list
          })
        });

        if (response.ok) {
          const result = await response.json();
          const summary = result.summary;

          await prisma.eventSettings.upsert({
            where: { key: `calibration_summary_${judgeId}` },
            create: { key: `calibration_summary_${judgeId}`, value: summary },
            update: { value: summary }
          });
        } else {
          console.error(`[AnomalyWorker] AI backend returned error: ${response.status}`);
        }
      } catch (err) {
        console.error(`[AnomalyWorker] Error calling AI backend:`, err.message);
      }

      return { success: true };

    } else if (taskName === 'run_post_normalisation_anomaly_check') {
      const { eventId } = data;
      
      const allEvals = await prisma.evaluation.findMany({
        where: { discarded: false, team: { eventId } },
        include: { judge: true, team: true }
      });

      // 1. Compute per-judge stats
      const judgeStats = {};
      allEvals.forEach(e => {
        if (!judgeStats[e.judgeId]) {
          judgeStats[e.judgeId] = { scores: [] };
        }
        const eff = e.overrideScore !== null ? e.overrideScore : (e.scoreCode + e.scoreInnovation + e.scorePresentaion) / 3;
        judgeStats[e.judgeId].scores.push(eff);
      });

      for (const jid in judgeStats) {
        const scores = judgeStats[jid].scores;
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        let std = 0.0;
        if (scores.length >= 2) {
          const variance = scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (scores.length - 1);
          std = Math.sqrt(variance);
        }
        judgeStats[jid].mean = mean;
        judgeStats[jid].std = Math.max(std, 0.5); // floor to 0.5 to avoid div by zero/huge z-scores
      }

      // 2. Compute normalized scores and team averages
      const teamStats = {};
      const evalNormalised = [];

      allEvals.forEach(e => {
        const eff = e.overrideScore !== null ? e.overrideScore : (e.scoreCode + e.scoreInnovation + e.scorePresentaion) / 3;
        const stats = judgeStats[e.judgeId];
        const z = (eff - stats.mean) / stats.std;
        const normalised = Math.max(1.0, Math.min(10.0, 5.5 + z * 1.5));
        
        evalNormalised.push({ ...e, normalised, effectiveScore: eff });

        if (!teamStats[e.teamId]) teamStats[e.teamId] = { normScores: [] };
        teamStats[e.teamId].normScores.push(normalised);
      });

      for (const tid in teamStats) {
        const arr = teamStats[tid].normScores;
        teamStats[tid].panelAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
      }

      // 3. Check for anomalies
      const thresholdSetting = await prisma.eventSettings.findUnique({ where: { key: `${eventId}_anomaly_threshold` }});
      const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 2.5;

      let flagsCreated = 0;

      for (const e of evalNormalised) {
        const teamAvg = teamStats[e.teamId].panelAvg;
        const deviation = Math.abs(e.normalised - teamAvg);

        if (deviation > threshold) {
          // Check if pending flag already exists
          const existing = await prisma.anomalyFlag.findFirst({
            where: { teamId: e.teamId, judgeId: e.judgeId, status: 'PENDING' }
          });

          if (!existing) {
            // Generate LLM explanation via AI backend
            let explanation = null;
            try {
              const aiRes = await fetch(`${AI_BACKEND_URL}/explain-anomaly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  team_name: e.team.name,
                  judge_name: e.judge.name,
                  judge_score: e.normalised,
                  panel_average: teamAvg,
                  threshold: threshold
                })
              });
              if (aiRes.ok) {
                const data = await aiRes.json();
                explanation = data.explanation;
              }
            } catch (err) {
              console.error("[AnomalyWorker] AI explain error:", err.message);
            }

            await prisma.anomalyFlag.create({
              data: {
                teamId: e.teamId,
                judgeId: e.judgeId,
                newScore: e.normalised,
                panelAvg: teamAvg,
                deviation: deviation,
                status: 'PENDING',
                llmExplanation: explanation
              }
            });

            await prisma.team.update({
              where: { id: e.teamId },
              data: { resultsHeld: true }
            });

            flagsCreated++;
          }
        }
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = flagsCreated > 0 
        ? `Last checked at ${timestamp}: Found ${flagsCreated} new anomalies.` 
        : `Last checked at ${timestamp}: 0 new anomalies found.`;

      await prisma.eventSettings.upsert({
        where: { key: `${eventId}_last_anomaly_check_result` },
        create: { key: `${eventId}_last_anomaly_check_result`, value: msg },
        update: { value: msg }
      });

      console.log(`[AnomalyWorker] Post-normalisation check complete. Flags created: ${flagsCreated}`);
      return { success: true, flagsCreated };
    }
  },
  {
    connection: sharedRedis,
    concurrency: 1,        // anomaly scans run one at a time — no need for parallelism
    stalledInterval: 60000, // check stalled jobs every 60s instead of default 30s
  }
);

anomalyWorker.on('completed', (job) => {
  console.log(`[AnomalyWorker] Job ${job.id} completed successfully.`);
});

anomalyWorker.on('failed', (job, err) => {
  console.error(`[AnomalyWorker] Job ${job?.id} failed:`, err.message);
});

console.log('[AnomalyWorker] Started — listening on anomaly_queue');
