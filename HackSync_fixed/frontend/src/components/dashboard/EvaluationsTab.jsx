import React, { useState, useEffect } from 'react';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';
const AI = import.meta.env.VITE_AI_URL || 'https://orchestr-ai.onrender.com';

export default function EvaluationsTab({ eventConfig, eventId }) {
  const [teams, setTeams] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, finalized: 0, average: 0 });

  const fetchData = async () => {
    try {
      // Get all published teams
      const teamsRes = await fetch(`${NODE}/api/admin/teams?status=ALL`);
      const teamsData = await teamsRes.json();
      const allTeams = teamsData.teams || [];

      // Get scores for each team
      let totalScores = 0, sumScores = 0, teamsWithScores = 0;
      const teamsWithData = await Promise.all(allTeams.map(async (team) => {
        try {
          const scoreRes = await fetch(`${NODE}/api/admin/scores/${team.id}`);
          const scoreData = await scoreRes.json();
          const scores = scoreData.scores || [];
          const avg = scoreData.average || 0;
          totalScores += scores.length;
          if (scores.length > 0) { sumScores += avg; teamsWithScores++; }
          return { ...team, scores, average: avg, anomalies: scoreData.anomalies || [] };
        } catch {
          return { ...team, scores: [], average: 0, anomalies: [] };
        }
      }));

      setTeams(teamsWithData);
      setStats({
        total: allTeams.length,
        pending: allTeams.length - teamsWithScores,
        finalized: teamsWithScores,
        average: teamsWithScores > 0 ? (sumScores / teamsWithScores).toFixed(2) : 0,
      });

      // Collect anomalies
      const allAnomalies = teamsWithData.flatMap(t =>
        (t.anomalies || []).map(a => ({ ...a, team_name: t.name }))
      );
      setAnomalies(allAnomalies);
    } catch (err) {
      console.error('EvaluationsTab fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleResolve = async (anomalyId, action) => {
    try {
      const payload = action === 'override' ? { overrideScore: parseFloat(overrideScore) } : {};
      await fetch(`${AI}/api/anomalies/${anomalyId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
      setSelectedAnomaly(null);
      setOverrideScore('');
    } catch (err) {
      alert('Failed to resolve anomaly');
    }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-6 h-6 border-2 border-stone-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-stone-400">Loading evaluations...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Evaluations</h2>
        <p className="text-sm text-stone-500 mt-1">Live scores from judge portal</p>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Teams', val: stats.total, sub: 'In competition' },
          { label: 'Pending Scores', val: stats.pending, sub: 'Not yet evaluated' },
          { label: 'Finalized', val: stats.finalized, sub: 'Teams scored' },
          { label: 'Global Average', val: stats.average || '—', sub: 'Across all judges' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{s.label}</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-white mt-1">{s.val}</p>
            <p className="text-xs text-stone-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* Anomaly flags */}
      {anomalies.length > 0 && (
        <section className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-5">
          <h3 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Score Anomalies ({anomalies.length})
          </h3>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="bg-white dark:bg-stone-900 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-white">{a.team_name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {a.judge_name} scored {a.score}/10 — panel avg {Number(a.panel_average || 0).toFixed(1)}/10
                    <span className="ml-2 text-red-600 font-bold">(Δ {Number(a.delta || Math.abs(a.score - (a.panel_average || 0))).toFixed(1)} pts)</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedAnomaly === a.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="10" step="0.5" value={overrideScore}
                        onChange={e => setOverrideScore(e.target.value)}
                        placeholder="New score"
                        className="w-24 border border-stone-300 rounded-lg px-2 py-1 text-sm" />
                      <button onClick={() => handleResolve(a.id, 'override')}
                        className="text-xs font-bold px-3 py-1.5 bg-red-600 text-white rounded-lg">Override</button>
                      <button onClick={() => handleResolve(a.id, 'dismiss')}
                        className="text-xs font-bold px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg">Dismiss</button>
                    </div>
                  ) : (
                    <button onClick={() => setSelectedAnomaly(a.id)}
                      className="text-xs font-bold px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teams leaderboard */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800 overflow-hidden">
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 dark:text-white">Score Breakdown</h3>
          <button onClick={fetchData} className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-stone-300 text-4xl block mb-2">analytics</span>
            <p className="text-sm font-bold text-stone-600 dark:text-stone-300">No teams yet</p>
            <p className="text-xs text-stone-400 mt-1">Generate and publish teams first, then judges can submit scores</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 dark:bg-stone-800/50">
                <tr className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                  <th className="px-5 py-3 text-left">Team</th>
                  <th className="px-5 py-3 text-left">Members</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Avg Score</th>
                  <th className="px-5 py-3 text-left">Evaluations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {teams.sort((a, b) => b.average - a.average).map((team, i) => (
                  <tr key={team.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-stone-900 dark:bg-stone-700 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="font-bold text-sm text-stone-900 dark:text-white">{team.name}</span>
                        {(team.anomalies || []).length > 0 && <span className="material-symbols-outlined text-red-500 text-[14px]">warning</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-500">
                      {(team.members || []).map(m => m.name).join(', ') || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        team.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{team.status}</span>
                    </td>
                    <td className="px-5 py-4 font-bold text-stone-900 dark:text-white">
                      {team.average > 0 ? `${Number(team.average).toFixed(1)}/10` : '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-500">
                      {(team.scores || []).length} judge{(team.scores || []).length !== 1 ? 's' : ''} scored
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
