import React, { useCallback, useEffect, useState } from 'react';
import TeamSelector from '../components/judge/TeamSelector';
import TeamProfile from '../components/judge/TeamProfile';
import ScoringPanel from '../components/judge/ScoringPanel';
import SuccessState from '../components/judge/SuccessState';
import { judgeApi } from '../api';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

// ── Slide-in contribution panel ───────────────────────────────────────────
function ContribDrawer({ teamId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !teamId) return;
    setLoading(true);
    setData(null);
    fetch(`${NODE}/api/github/team/${teamId}/leaderboard`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [teamId, open]);

  if (!open) return null;

  const hasFairnessFlag = data?.leaderboard?.some(u => u.status !== 'Normal');
  const dominant = data?.leaderboard?.find(u => u.status === 'Dominating Contributions');
  const lowUsers = data?.leaderboard?.filter(u => u.status === 'Low Participation') || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white dark:bg-stone-950 border-l border-stone-200 dark:border-stone-800 z-40 flex flex-col shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-stone-500 text-[18px]">hub</span>
            <h2 className="text-sm font-bold text-stone-900 dark:text-white">GitHub Contributions</h2>
            {hasFairnessFlag && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">warning</span>
                Fairness flag
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700" />
                    <div className="h-3 w-28 bg-stone-200 dark:bg-stone-700 rounded" />
                    <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full" />
                    <div className="h-3 w-8 bg-stone-200 dark:bg-stone-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (!data?.connected || !data.leaderboard?.length) && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-stone-400 text-[22px]">code_off</span>
              </div>
              <p className="text-sm font-bold text-stone-600 dark:text-stone-300">No contribution data</p>
              <p className="text-xs text-stone-400 max-w-[260px] leading-relaxed">
                {!data?.connected
                  ? 'This team has not linked a GitHub repository yet.'
                  : 'No analysis has been run yet. The organizer can trigger this from the Evaluations tab.'}
              </p>
            </div>
          )}

          {!loading && data?.connected && data.leaderboard?.length > 0 && (
            <>
              {/* Repo + timestamp */}
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span className="material-symbols-outlined text-[14px]">commit</span>
                <span className="font-medium text-stone-600 dark:text-stone-300">{data.repository}</span>
                {data.lastAnalyzed && (
                  <span>· {new Date(data.lastAnalyzed).toLocaleDateString()}</span>
                )}
              </div>

              {/* Summary pills */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Contributors', val: data.leaderboard.length, icon: 'group' },
                  { label: 'Total commits', val: data.leaderboard.reduce((s, u) => s + u.commits, 0), icon: 'commit' },
                  { label: 'Total PRs', val: data.leaderboard.reduce((s, u) => s + u.prs, 0), icon: 'merge' },
                ].map(s => (
                  <div key={s.label} className="bg-stone-50 dark:bg-stone-900 rounded-xl p-3 text-center border border-stone-100 dark:border-stone-800">
                    <span className="material-symbols-outlined text-stone-400 text-[16px] block mb-1">{s.icon}</span>
                    <p className="text-lg font-bold text-stone-900 dark:text-white">{s.val}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Fairness alert */}
              {hasFairnessFlag && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <p className="font-bold mb-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    Contribution imbalance detected
                  </p>
                  {dominant && <p>{dominant.username} contributed {dominant.percentage}% of total activity (threshold: 70%).</p>}
                  {lowUsers.length > 0 && <p className="mt-0.5">{lowUsers.map(u => u.username).join(', ')} {lowUsers.length === 1 ? 'has' : 'have'} below 5% participation.</p>}
                </div>
              )}

              {/* Contributor breakdown */}
              <div className="space-y-4">
                {data.leaderboard.map((user) => {
                  const isHigh = user.status === 'Dominating Contributions';
                  const isLow = user.status === 'Low Participation';
                  const barColor = isHigh ? 'bg-amber-500' : isLow ? 'bg-red-400' : 'bg-emerald-500';
                  const avatarClass = isHigh
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : isLow
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300';

                  return (
                    <div key={user.username} className="space-y-2">
                      {/* Name row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarClass}`}>
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex-1 truncate">
                          {user.username}
                        </span>
                        <span className="text-sm font-bold text-stone-900 dark:text-white">
                          {user.percentage}%
                        </span>
                        {(isHigh || isLow) && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isHigh ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                   : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {isHigh ? 'Dominant' : 'Low'}
                          </span>
                        )}
                      </div>

                      {/* Bar */}
                      <div className="ml-11 bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${user.percentage}%` }}
                        />
                      </div>

                      {/* Stat pills */}
                      <div className="ml-11 flex gap-3 flex-wrap">
                        {[
                          { icon: 'commit', label: 'commits', val: user.commits },
                          { icon: 'merge', label: 'PRs', val: user.prs },
                          { icon: 'bug_report', label: 'issues', val: user.issues },
                          { icon: 'star', label: 'score', val: Math.round(user.score) },
                        ].map(s => (
                          <span key={s.label} className="flex items-center gap-0.5 text-[11px] text-stone-400 dark:text-stone-500">
                            <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                            <span className="font-medium text-stone-600 dark:text-stone-400">{s.val}</span>
                            <span>{s.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex-shrink-0">
          <p className="text-[10px] text-stone-400 text-center">
            Read-only · Re-analysis available from the Evaluations tab
          </p>
        </div>
      </div>
    </>
  );
}

export default function JudgeEvaluate({ judgeName = 'Judge', initialTeamId, judgeToken, onBack }) {
  const [teams, setTeams] = useState([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [toast, setToast] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Close drawer when team changes
  useEffect(() => { setDrawerOpen(false); }, [activeTeamIndex]);

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
            <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 px-3 py-1.5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Dashboard
            </button>
          )}
          <span className="text-sm font-semibold text-stone-500 dark:text-stone-400 tracking-wide">
            AlgoRythm · <span className="text-stone-900 dark:text-white">Judge Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Contributions button — always visible in top bar */}
          {activeTeam && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">hub</span>
              Contributions
            </button>
          )}
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{judgeName}</span>
          <div className="w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs font-bold">{initials}</div>
        </div>
      </div>

      <TeamSelector teams={teams} activeIndex={activeTeamIndex} onSelect={setActiveTeamIndex} />

      <div className="max-w-[820px] mx-auto px-6 py-8">
        {activeTeam?.scored ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <span className="text-sm font-semibold text-emerald-800">Scores submitted ✓</span>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">hub</span>
                View contributions
              </button>
            </div>
            <TeamProfile team={activeTeam} />
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
                <div className="space-y-4">
                  <TeamProfile team={activeTeam} />
                  {/* Inline contribution teaser */}
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-stone-400 text-[18px]">hub</span>
                      <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">GitHub Contributions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300">
                      View breakdown
                      <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                    </div>
                  </button>
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

      {/* Contribution drawer */}
      <ContribDrawer
        teamId={activeTeam?.id}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 transition-all duration-300 ${toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}