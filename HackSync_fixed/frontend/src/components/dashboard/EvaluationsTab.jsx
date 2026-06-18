import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';
const AI = import.meta.env.VITE_AI_URL || 'https://orchestr-ai.onrender.com';

function ContribPanel({ contrib, teamId, analyzing, onAnalyze, githubRepoUrl }) {
  if (!githubRepoUrl) {
    return (
      <div className="px-5 pb-4">
        <div className="bg-stone-50 dark:bg-stone-800/40 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-stone-400 text-[16px]">link_off</span>
          <span className="text-xs text-stone-400">No GitHub repository linked by this team yet.</span>
        </div>
      </div>
    );
  }

  if (!contrib?.connected || !contrib.leaderboard?.length) {
    return (
      <div className="px-5 pb-4">
        <div className="bg-stone-50 dark:bg-stone-800/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-stone-400 text-[16px]">analytics</span>
            <span className="text-xs text-stone-500">Repository linked — no analysis run yet.</span>
          </div>
          <button
            onClick={() => onAnalyze(teamId)}
            disabled={analyzing}
            className="text-xs font-bold px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg hover:opacity-80 disabled:opacity-40 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">hub</span>
            {analyzing ? 'Analyzing...' : 'Analyze Contributions'}
          </button>
        </div>
      </div>
    );
  }

  const { leaderboard, repository, lastAnalyzed } = contrib;
  const totalScore = leaderboard.reduce((s, u) => s + u.score, 0);
  const flagged = leaderboard.some(u => u.status !== 'Normal');
  const dominant = leaderboard.find(u => u.status === 'Dominating Contributions');
  const lowUsers = leaderboard.filter(u => u.status === 'Low Participation');

  return (
    <div className="px-5 pb-5">
      <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-stone-50 dark:bg-stone-800/50 px-4 py-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-stone-500 text-[16px]">code</span>
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{repository}</span>
            {lastAnalyzed && (
              <span className="text-[10px] text-stone-400">
                · analyzed {new Date(lastAnalyzed).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {flagged && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">warning</span>
                Fairness flag
              </span>
            )}
            <button
              onClick={() => onAnalyze(teamId)}
              disabled={analyzing}
              title="Re-analyze"
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-40 flex items-center gap-1 text-xs"
            >
              <span className={`material-symbols-outlined text-[15px] ${analyzing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>

        {/* Contributor bars */}
        <div className="p-4 space-y-3">
          {leaderboard.map((user, idx) => {
            const isHigh = user.status === 'Dominating Contributions';
            const isLow = user.status === 'Low Participation';
            const barColor = isHigh ? 'bg-amber-500' : isLow ? 'bg-red-400' : 'bg-emerald-500';
            const badgeClass = isHigh
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : isLow
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : '';

            return (
              <div key={user.username}>
                <div className="flex items-center gap-3 mb-1">
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    isHigh ? 'bg-amber-100 text-amber-700' :
                    isLow  ? 'bg-red-100 text-red-700' :
                    'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                  }`}>
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>

                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 w-32 truncate">
                    {user.username}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 bg-stone-100 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${user.percentage}%` }}
                    />
                  </div>

                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300 w-10 text-right">
                    {user.percentage}%
                  </span>

                  {(isHigh || isLow) && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                      {isHigh ? 'Dominant' : 'Low'}
                    </span>
                  )}
                </div>

                {/* Stat pills */}
                <div className="ml-9 flex gap-2">
                  {[
                    { icon: 'commit', label: 'commits', val: user.commits },
                    { icon: 'merge', label: 'PRs', val: user.prs },
                    { icon: 'bug_report', label: 'issues', val: user.issues },
                    { icon: 'star', label: 'score', val: user.score },
                  ].map(s => (
                    <span key={s.label} className="flex items-center gap-0.5 text-[10px] text-stone-400 dark:text-stone-500">
                      <span className="material-symbols-outlined text-[11px]">{s.icon}</span>
                      {s.val} {s.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fairness summary */}
        {flagged && (
          <div className={`px-4 py-3 border-t text-xs leading-relaxed ${
            dominant
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            <span className="material-symbols-outlined text-[13px] align-middle mr-1">info</span>
            {dominant && `${dominant.username} contributed ${dominant.percentage}% of total activity — significantly above the 70% threshold. `}
            {lowUsers.length > 0 && `${lowUsers.map(u => u.username).join(', ')} ${lowUsers.length === 1 ? 'has' : 'have'} below 5% participation.`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvaluationsTab({ eventConfig, eventId }) {
  const [teams, setTeams] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, finalized: 0, average: 0 });
  const [explanations, setExplanations] = useState({});
  const [explaining, setExplaining] = useState({});
  const [contributions, setContributions] = useState({});
  const [analyzingContrib, setAnalyzingContrib] = useState({});
  const [expandedContrib, setExpandedContrib] = useState({});

  const fetchData = async () => {
    if (!eventId) return;
    try {
      const teamsRes = await fetch(`${NODE}/api/admin/teams?status=ALL&eventId=${eventId}`);
      const teamsData = await teamsRes.json();
      const allTeams = teamsData.teams || [];

      const lbRes = await fetch(`${NODE}/api/admin/leaderboard?eventId=${eventId}`);
      const lbData = await lbRes.json();
      const lbMap = {};
      (lbData.leaderboard || []).forEach(t => { lbMap[t.id] = t.sortScore; });

      let totalScores = 0, sumScores = 0, teamsWithScores = 0;
      const teamsWithData = await Promise.all(allTeams.map(async (team) => {
        try {
          const scoreRes = await fetch(`${NODE}/api/admin/scores/${team.id}`);
          const scoreData = await scoreRes.json();
          const scores = scoreData.scores || [];
          const avg = lbMap[team.id] !== undefined ? lbMap[team.id] : (scoreData.average || 0);
          totalScores += scores.length;
          if (scores.length > 0) { sumScores += avg; teamsWithScores++; }
          return { ...team, scores, average: avg, anomalies: scoreData.anomalies || [] };
        } catch {
          return { ...team, scores: [], average: lbMap[team.id] || 0, anomalies: [] };
        }
      }));

      setTeams(teamsWithData);
      setStats({
        total: allTeams.length,
        pending: allTeams.length - teamsWithScores,
        finalized: teamsWithScores,
        average: teamsWithScores > 0 ? (sumScores / teamsWithScores).toFixed(2) : 0,
      });

      const allAnomalies = teamsWithData.flatMap(t =>
        (t.anomalies || []).map(a => ({ ...a, team_name: t.name }))
      );
      setAnomalies(allAnomalies);

      const contribMap = {};
      await Promise.all(teamsWithData.map(async (team) => {
        try {
          const res = await fetch(`${NODE}/api/github/team/${team.id}/leaderboard`);
          const data = await res.json();
          if (data.success) contribMap[team.id] = data;
        } catch {}
      }));
      setContributions(contribMap);
    } catch (err) {
      console.error('EvaluationsTab fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (eventId) fetchData(); }, [eventId]);

  const handleAnalyzeContrib = async (teamId) => {
    setAnalyzingContrib(prev => ({ ...prev, [teamId]: true }));
    setExpandedContrib(prev => ({ ...prev, [teamId]: true }));
    try {
      const res = await fetch(`${NODE}/api/github/analyze/team/${teamId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setContributions(prev => ({
          ...prev,
          [teamId]: { success: true, connected: true, leaderboard: data.leaderboard, repository: data.repository },
        }));
      } else {
        alert(data.message || 'Could not analyze contributions for this team.');
      }
    } catch {
      alert('Failed to analyze contributions.');
    } finally {
      setAnalyzingContrib(prev => ({ ...prev, [teamId]: false }));
    }
  };

  const toggleContrib = (teamId) => {
    setExpandedContrib(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const handleResolve = async (anomalyId, action) => {
    try {
      const payload = action === 'override' ? { overrideScore: parseFloat(overrideScore) } : {};
      await fetch(`${NODE}/api/admin/anomalies/${anomalyId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
      setSelectedAnomaly(null);
      setOverrideScore('');
      fetchData();
    } catch {
      alert('Failed to resolve anomaly');
    }
  };

  const handleExplain = async (anomaly) => {
    setExplaining(prev => ({ ...prev, [anomaly.id]: true }));
    try {
      const res = await aiApi.explainAnomaly({
        team_name: anomaly.team_name,
        judge_name: anomaly.judge_name,
        judge_score: anomaly.score,
        panel_average: anomaly.panel_average,
        threshold: 2.0,
      });
      setExplanations(prev => ({ ...prev, [anomaly.id]: res }));
    } catch {
      setExplanations(prev => ({
        ...prev,
        [anomaly.id]: { explanation: 'Failed to generate explanation.', recommendation: 'accept', recommendation_reason: 'Could not generate recommendation.' }
      }));
    }
    setExplaining(prev => ({ ...prev, [anomaly.id]: false }));
  };

  const handlePublishAndQualify = async () => {
    if (anomalies.length > 0) { alert('Resolve all score anomalies before publishing results.'); return; }
    const qualifyingTeams = teams.filter(t => t.average >= 8);
    if (qualifyingTeams.length === 0) { alert('No teams meet the qualification threshold yet.'); return; }
    if (!confirm(`Qualify ${qualifyingTeams.length} team(s) with avg score ≥ 8? Participants will be notified.`)) return;
    try {
      for (const team of qualifyingTeams) {
        await fetch(`${NODE}/api/participants/qualify-team/${team.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      }
      alert(`✅ ${qualifyingTeams.length} team(s) qualified successfully!`);
    } catch { alert('Error qualifying teams.'); }
  };

  const recColors = (rec) => {
    if (rec === 'discard') return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', btn: 'bg-red-600 hover:bg-red-700 text-white' };
    if (rec === 'override') return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700 text-white' };
    return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
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
          <div className="space-y-3">
            {anomalies.map((a, i) => {
              const exp = explanations[a.id];
              const colors = exp ? recColors(exp.recommendation) : null;
              return (
                <div key={i} className="flex flex-col gap-2">
                  <div className="bg-white dark:bg-stone-900 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-stone-900 dark:text-white">{a.team_name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {a.judge_name} scored {a.score}/10 — panel avg {Number(a.panel_average || 0).toFixed(1)}/10
                        <span className="ml-2 text-red-600 font-bold">(Δ {Number(a.delta || Math.abs(a.score - (a.panel_average || 0))).toFixed(1)} pts)</span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {/* Explain button — always visible */}
                      <button
                        onClick={() => handleExplain(a)}
                        disabled={explaining[a.id]}
                        className="text-xs font-bold px-3 py-1.5 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 flex items-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                        {explaining[a.id] ? 'Analyzing...' : 'Explain (AI)'}
                      </button>

                      {/* Override input */}
                      {selectedAnomaly === a.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="10" step="0.5" value={overrideScore}
                            onChange={e => setOverrideScore(e.target.value)} placeholder="New score"
                            className="w-24 border border-stone-300 rounded-lg px-2 py-1 text-sm" />
                          <button onClick={() => handleResolve(a.id, 'override')} className="text-xs font-bold px-3 py-1.5 bg-red-600 text-white rounded-lg">Apply Override</button>
                          <button onClick={() => setSelectedAnomaly(null)} className="text-xs font-bold px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleResolve(a.id, 'accept')} className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200">Accept Score</button>
                          <button onClick={() => handleResolve(a.id, 'decline')} className="text-xs font-bold px-3 py-1.5 bg-red-100 text-red-800 rounded-lg hover:bg-red-200">Decline Score</button>
                          <button onClick={() => setSelectedAnomaly(a.id)} className="text-xs font-bold px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Override</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Explanation */}
                  {exp && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm text-purple-900">
                      <strong>AI Analysis:</strong> {exp.explanation}
                    </div>
                  )}
                  {exp && (
                    <div className={`rounded-xl px-4 py-3 border ${colors.bg}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${colors.text}`}>AI Recommendation: {exp.recommendation}</p>
                      <p className="text-xs text-stone-600">{exp.recommendation_reason}</p>
                      <button
                        onClick={() => { if (exp.recommendation === 'override') { setSelectedAnomaly(a.id); } else { handleResolve(a.id, exp.recommendation === 'discard' ? 'decline' : 'accept'); } }}
                        className={`mt-3 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition-all ${colors.btn}`}>
                        Apply — {exp.recommendation}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Teams table */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800 overflow-hidden">
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 dark:text-white">Score Breakdown</h3>
          <div className="flex gap-2">
            <button onClick={handlePublishAndQualify} className="text-xs font-bold px-4 py-2 bg-[#1B4332] text-white rounded-lg hover:opacity-90">
              Publish Results & Qualify Teams
            </button>
            <button onClick={fetchData} className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
            </button>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-stone-300 text-4xl block mb-2">analytics</span>
            <p className="text-sm font-bold text-stone-600 dark:text-stone-300">No teams yet</p>
            <p className="text-xs text-stone-400 mt-1">Generate and publish teams first, then judges can submit scores</p>
          </div>
        ) : (
          <div>
            {teams.sort((a, b) => b.average - a.average).map((team, i) => {
              const contrib = contributions[team.id];
              const isExpanded = expandedContrib[team.id];
              const flagged = contrib?.leaderboard?.some(u => u.status !== 'Normal');
              const hasData = contrib?.connected && contrib.leaderboard?.length > 0;

              return (
                <div key={team.id} className="border-b border-stone-100 dark:border-stone-800 last:border-b-0">
                  {/* Main row */}
                  <div className="px-5 py-4 flex items-center gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                    {/* Rank + name */}
                    <div className="flex items-center gap-2 w-40 flex-shrink-0">
                      <span className="w-6 h-6 rounded-full bg-stone-900 dark:bg-stone-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="font-bold text-sm text-stone-900 dark:text-white truncate">{team.name}</span>
                      {(team.anomalies || []).length > 0 && <span className="material-symbols-outlined text-red-500 text-[14px] flex-shrink-0">warning</span>}
                    </div>

                    {/* Members */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-stone-500 truncate">{(team.members || []).map(m => m.name).join(', ') || '—'}</p>
                    </div>

                    {/* Status */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      team.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{team.status}</span>

                    {/* Score */}
                    <div className="w-20 flex-shrink-0 text-right">
                      <span className="font-bold text-stone-900 dark:text-white text-sm">
                        {team.average > 0 ? `${Number(team.average).toFixed(1)}/10` : '—'}
                      </span>
                      <p className="text-[10px] text-stone-400">{(team.scores || []).length} judge{(team.scores || []).length !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Contributions toggle */}
                    <div className="w-48 flex-shrink-0 flex items-center justify-end gap-2">
                      {!team.githubRepoUrl ? (
                        <span className="text-xs text-stone-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">link_off</span>
                          No repo
                        </span>
                      ) : hasData ? (
                        <button
                          onClick={() => toggleContrib(team.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                            isExpanded
                              ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white'
                              : 'border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                          }`}
                        >
                          {flagged && <span className="material-symbols-outlined text-[13px] text-amber-500">warning</span>}
                          <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                          {isExpanded ? 'Hide' : 'View'} Breakdown
                          <span className="material-symbols-outlined text-[13px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAnalyzeContrib(team.id)}
                          disabled={analyzingContrib[team.id]}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[13px]">hub</span>
                          {analyzingContrib[team.id] ? 'Analyzing...' : 'Analyze'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded contribution panel */}
                  {isExpanded && (
                    <ContribPanel
                      contrib={contrib}
                      teamId={team.id}
                      analyzing={analyzingContrib[team.id]}
                      onAnalyze={handleAnalyzeContrib}
                      githubRepoUrl={team.githubRepoUrl}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}