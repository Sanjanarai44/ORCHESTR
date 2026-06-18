import React, { useCallback, useEffect, useRef, useState } from 'react';
import TeamSelector from '../components/judge/TeamSelector';
import TeamProfile from '../components/judge/TeamProfile';
import ScoringPanel from '../components/judge/ScoringPanel';
import SuccessState from '../components/judge/SuccessState';
import { judgeApi } from '../api';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

// Read-only contribution breakdown widget
function ContributionBreakdown({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch(`${NODE}/api/github/team/${teamId}/leaderboard`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return (
    <div className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-5 border border-stone-200 dark:border-stone-800/50 animate-pulse">
      <div className="h-3 w-40 bg-stone-200 dark:bg-stone-700 rounded mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-3 bg-stone-100 dark:bg-stone-800 rounded" />)}
      </div>
    </div>
  );

  if (!data?.connected || !data.leaderboard?.length) return (
    <div className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-5 border border-stone-200 dark:border-stone-800/50">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-1">GitHub Contributions</p>
      <p className="text-sm text-stone-400">
        {!data?.connected ? 'No repository linked by this team.' : 'No contribution data yet — organizer can trigger analysis from the Evaluations tab.'}
      </p>
    </div>
  );

  const hasFairnesFlag = data.leaderboard.some(u => u.status !== 'Normal');

  return (
    <div className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-5 border border-stone-200 dark:border-stone-800/50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          GitHub Contributions
        </p>
        {hasFairnesFlag && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">warning</span>
            Fairness Flag
          </span>
        )}
      </div>

      <p className="text-[10px] text-stone-400 font-medium">
        {data.repository} · last analyzed {data.lastAnalyzed ? new Date(data.lastAnalyzed).toLocaleDateString() : 'recently'}
      </p>

      <div className="space-y-2">
        {data.leaderboard.map((user) => (
          <div key={user.username} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 w-28 truncate">
              {user.username}
            </span>

            {/* Bar */}
            <div className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  user.status === 'Dominating Contributions' ? 'bg-amber-500' :
                  user.status === 'Low Participation'        ? 'bg-red-400' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${user.percentage}%` }}
              />
            </div>

            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 w-10 text-right">
              {user.percentage}%
            </span>

            {user.status !== 'Normal' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                user.status === 'Dominating Contributions'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {user.status === 'Dominating Contributions' ? 'Dominant' : 'Low'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Hover detail row */}
      <div className="pt-2 border-t border-stone-200 dark:border-stone-700 grid grid-cols-3 gap-2">
        {data.leaderboard.slice(0, 3).map(user => (
          <div key={user.username} className="text-center">
            <p className="text-[10px] text-stone-400 truncate">{user.username}</p>
            <p className="text-[10px] text-stone-500">
              {user.commits}c · {user.prs}pr · {user.issues}i
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JudgeEvaluate({ judgeName = 'Judge', initialTeamId, judgeToken, onBack }) {
  const [teams, setTeams] = useState([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await judgeApi.getTeams(judgeToken);
        setTeams(data.teams || []);
        let startIndex = 0;
        if (initialTeamId) {
          const idx = (data.teams || []).findIndex(t => t.id === initialTeamId);
          if (idx >= 0) startIndex = idx;
        } else {
          const firstUnscored = (data.teams || []).findIndex((t) => !t.scored);
          if (firstUnscored >= 0) startIndex = firstUnscored;
        }
        setActiveTeamIndex(startIndex);
        setAllDone(data.teams?.length > 0 && data.teams.every((t) => t.scored));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleScoreSubmitted = useCallback(async (teamId, nextTeamId) => {
    try {
      const data = await judgeApi.getTeams(judgeToken);
      if (data) {
        const updatedTeams = data.teams || [];
        setTeams(updatedTeams);
        const allScored = updatedTeams.every((t) => t.scored);
        setAllDone(updatedTeams.length > 0 && allScored);
        if (!allScored && nextTeamId) {
          const nextIdx = updatedTeams.findIndex((t) => t.id === nextTeamId);
          if (nextIdx >= 0) setActiveTeamIndex(nextIdx);
        }
      }
    } catch (err) {
      console.error('Error reloading teams after submit:', err);
    }
    const teamName = teams.find((t) => t.id === teamId)?.name || 'Team';
    showToast(`Scores submitted for ${teamName} ✓`);
  }, [teams, judgeToken]);

  const activeTeam = teams[activeTeamIndex] || null;
  const initials = judgeName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  if (!loading && allDone) return <SuccessState judgeName={judgeName} />;

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="w-10 h-10 border-4 border-stone-200 dark:border-stone-800/50 border-t-stone-900 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-400 font-medium">Loading your evaluation queue…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-sm">
        <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
        <h2 className="text-lg font-bold text-stone-900 dark:text-white">Failed to load</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-stone-900 dark:text-white underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Top bar */}
      <div className="border-b border-stone-200 dark:border-stone-800/50 px-6 py-4 flex items-center justify-between sticky top-0 bg-white dark:bg-stone-950/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Dashboard
            </button>
          )}
          <span className="text-sm font-semibold text-stone-500 dark:text-stone-400 tracking-wide">
            AlgoRythm · <span className="text-stone-900 dark:text-white">Judge Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{judgeName}</span>
          <div className="w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs font-bold">{initials}</div>
        </div>
      </div>

      {/* Team selector tabs */}
      <TeamSelector teams={teams} activeIndex={activeTeamIndex} onSelect={setActiveTeamIndex} />

      {/* Main content */}
      <div className="max-w-[820px] mx-auto px-6 py-8">
        {activeTeam?.scored ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              <span className="text-sm font-semibold text-emerald-800">Scores submitted ✓</span>
            </div>
            <TeamProfile team={activeTeam} />
            {/* ── Contribution breakdown (read-only) ── */}
            <ContributionBreakdown teamId={activeTeam.id} />
            {activeTeam.submittedScores && (
              <div className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-6 space-y-4 border border-stone-200 dark:border-stone-800/50">
                <h3 className="text-base font-bold text-stone-900 dark:text-white">Submitted Scores</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Code Quality', value: activeTeam.submittedScores.code },
                    { label: 'Innovation', value: activeTeam.submittedScores.innovation },
                    { label: 'Presentation', value: activeTeam.submittedScores.presentation },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center bg-white dark:bg-stone-950 rounded-xl p-4 border border-stone-200 dark:border-stone-800/50">
                      <div className="text-3xl font-bold text-stone-900 dark:text-white">{value}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">{label}</div>
                    </div>
                  ))}
                </div>
                {activeTeam.submittedScores.starRating > 0 && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`material-symbols-outlined text-[20px] ${s <= activeTeam.submittedScores.starRating ? 'text-amber-400' : 'text-stone-200 dark:text-stone-700'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                )}
                <div className="bg-white dark:bg-stone-950 rounded-xl p-4 border border-stone-200 dark:border-stone-800/50">
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1">EVALUATION NOTES</p>
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{activeTeam.submittedScores.comment}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {activeTeam ? (
              <>
                {/* Left col: team profile + contribution breakdown stacked */}
                <div className="space-y-6">
                  <TeamProfile team={activeTeam} />
                  <ContributionBreakdown teamId={activeTeam.id} />
                </div>
                <ScoringPanel team={activeTeam} judgeToken={judgeToken} onSubmitted={handleScoreSubmitted} />
              </>
            ) : (
              <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2">
                    <path d="M12 22v-5m-5-5h10M4 4h16v16H4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">No teams available</h3>
                <p className="text-stone-500 dark:text-stone-400 mt-1 max-w-sm">You don't have any teams assigned to evaluate yet, or you have completed all evaluations.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 transition-all duration-300 animate-[slideUp_0.3s_ease-out] ${toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}