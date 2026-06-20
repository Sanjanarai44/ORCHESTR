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
        className="fixed inset-0 bg-black/20 z-30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-[#012d1d]/10 z-40 flex flex-col shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#012d1d]/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#414844] text-[18px]">hub</span>
            <h2 className="text-sm font-bold text-[#012d1d]">GitHub Contributions</h2>
            {hasFairnessFlag && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#fef3c7] text-[#92400e] rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">warning</span>
                Fairness flag
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#414844] hover:text-[#012d1d] hover:bg-[#F5F3F0] transition-colors"
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
                    <div className="w-8 h-8 rounded-full bg-[#012d1d]/10" />
                    <div className="h-3 w-28 bg-[#012d1d]/10 rounded" />
                    <div className="flex-1 h-2 bg-[#012d1d]/5 rounded-full" />
                    <div className="h-3 w-8 bg-[#012d1d]/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (!data?.connected || !data.leaderboard?.length) && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F5F3F0] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#414844] text-[22px]">code_off</span>
              </div>
              <p className="text-sm font-bold text-[#031f22]">No contribution data</p>
              <p className="text-xs text-[#414844] max-w-[260px] leading-relaxed">
                {!data?.connected
                  ? 'This team has not linked a GitHub repository yet.'
                  : 'No analysis has been run yet. The organizer can trigger this from the Evaluations tab.'}
              </p>
            </div>
          )}

          {!loading && data?.connected && data.leaderboard?.length > 0 && (
            <>
              {/* Repo + timestamp */}
              <div className="flex items-center gap-2 text-xs text-[#414844]">
                <span className="material-symbols-outlined text-[14px]">commit</span>
                <span className="font-medium text-[#031f22]">{data.repository}</span>
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
                  <div key={s.label} className="bg-[#F5F3F0] rounded-xl p-3 text-center border border-[#012d1d]/8">
                    <span className="material-symbols-outlined text-[#414844] text-[16px] block mb-1">{s.icon}</span>
                    <p className="text-lg font-bold text-[#012d1d]">{s.val}</p>
                    <p className="text-[10px] text-[#414844] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Fairness alert */}
              {hasFairnessFlag && (
                <div className="bg-[#fef3c7] border border-[#f59e0b]/30 rounded-xl px-4 py-3 text-xs text-[#92400e] leading-relaxed">
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
                  const barColor = isHigh ? 'bg-amber-500' : isLow ? 'bg-red-400' : 'bg-[#012d1d]';
                  const avatarClass = isHigh
                    ? 'bg-amber-100 text-amber-700'
                    : isLow
                    ? 'bg-red-100 text-red-700'
                    : 'bg-[#F5F3F0] text-[#414844]';

                  return (
                    <div key={user.username} className="space-y-2">
                      {/* Name row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarClass}`}>
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-[#031f22] flex-1 truncate">
                          {user.username}
                        </span>
                        <span className="text-sm font-bold text-[#012d1d]">
                          {user.percentage}%
                        </span>
                        {(isHigh || isLow) && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isHigh ? 'bg-amber-100 text-amber-700'
                                   : 'bg-red-100 text-red-700'
                          }`}>
                            {isHigh ? 'Dominant' : 'Low'}
                          </span>
                        )}
                      </div>

                      {/* Bar */}
                      <div className="ml-11 bg-[#012d1d]/10 rounded-full h-2 overflow-hidden">
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
                          <span key={s.label} className="flex items-center gap-0.5 text-[11px] text-[#414844]">
                            <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                            <span className="font-medium text-[#031f22]">{s.val}</span>
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
        <div className="px-6 py-4 border-t border-[#012d1d]/8 flex-shrink-0">
          <p className="text-[10px] text-[#414844] text-center">
            Read-only · Re-analysis available from the Evaluations tab
          </p>
        </div>
      </div>
    </>
  );
}

export default function JudgeEvaluate({ judgeName = 'Judge', initialTeamId, judgeToken, onBack }) {
  const [teams, setTeams] = useState([]);
  const [eventId, setEventId] = useState(null);
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
        setEventId(data.eventId);
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
        setEventId(data.eventId);
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

  // We decode judgeToken to get judge details if available, or fallback to judgeName.
  // We'll pass judgeName as a fallback for judgeId if no token decoding is simple here.
  if (!loading && allDone) return <SuccessState judgeName={judgeName} eventId={eventId} judgeId={judgeName} />;

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3F0] flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="w-10 h-10 border-4 border-[#012d1d]/20 border-t-[#012d1d] rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[#414844] font-medium">Loading your evaluation queue…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F5F3F0] flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-sm">
        <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
        <h2 className="text-lg font-bold text-[#012d1d]">Failed to load</h2>
        <p className="text-sm text-[#414844]">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-[#012d1d] underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F3F0] relative overflow-hidden font-sans">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#012d1d 1px, transparent 1px), linear-gradient(90deg, #012d1d 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Ambient blurs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#a5d0b9]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#012d1d]/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Top bar */}
      <div className="border-b border-[#E2DDD8] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#F5F3F0]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-[#414844] hover:text-[#012d1d] bg-white/60 hover:bg-white px-4 py-2 rounded-xl transition-all border border-white shadow-sm">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Dashboard
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#012d1d] flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[#a5d0b9] text-[16px]">gavel</span>
            </div>
            <span className="text-sm font-extrabold text-[#012d1d] tracking-wide">
              ORCHESTR <span className="text-[#a5d0b9] mx-1">•</span> Judge Portal
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Contributions button — always visible in top bar */}
          {activeTeam && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 border border-[#a5d0b9] bg-[#e8f5ef] text-[#012d1d] rounded-xl hover:bg-[#d6f3f7] transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">hub</span>
              GitHub Activity
            </button>
          )}
          <div className="flex items-center gap-3 pl-4 border-l border-[#E2DDD8]">
            <span className="text-sm font-bold text-[#031f22]">{judgeName}</span>
            <div className="w-9 h-9 bg-gradient-to-br from-[#012d1d] to-[#024a31] text-white rounded-full flex items-center justify-center text-xs font-extrabold shadow-md border-2 border-white">
              {initials}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <TeamSelector teams={teams} activeIndex={activeTeamIndex} onSelect={setActiveTeamIndex} />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-10 relative z-10">
        {activeTeam?.scored ? (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-[#e8f5ef] to-[#d6f3f7] border border-[#a5d0b9] rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#012d1d] flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[#a5d0b9]">check</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-[#012d1d]">Evaluation Complete</p>
                  <p className="text-xs text-[#3d5a47] font-medium mt-0.5">Scores for {activeTeam.name} have been recorded successfully.</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-xs font-bold text-[#012d1d] bg-white px-4 py-2 rounded-xl hover:bg-[#F5F3F0] transition-colors border border-[#a5d0b9]/50 flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                View Activity
              </button>
            </div>
            <TeamProfile team={activeTeam} />
            {activeTeam.submittedScores && (
              <div className="bg-white rounded-3xl p-8 space-y-6 border border-[#E2DDD8] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#012d1d]" />
                <h3 className="text-lg font-extrabold text-[#012d1d] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#a5d0b9]">fact_check</span>
                  Submitted Scores
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Code Quality', value: activeTeam.submittedScores.code },
                    { label: 'Innovation', value: activeTeam.submittedScores.innovation },
                    { label: 'Presentation', value: activeTeam.submittedScores.presentation },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center bg-[#FAFAF9] rounded-2xl p-6 border border-[#E2DDD8]">
                      <div className="text-4xl font-black text-[#012d1d]">{value}</div>
                      <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mt-2">{label}</div>
                    </div>
                  ))}
                </div>
                {activeTeam.submittedScores.starRating > 0 && (
                  <div className="flex items-center gap-1 bg-[#FAFAF9] p-4 rounded-2xl border border-[#E2DDD8] w-fit">
                    <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mr-2">Overall</span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`material-symbols-outlined text-[24px] ${s <= activeTeam.submittedScores.starRating ? 'text-[#f59e0b]' : 'text-[#E2DDD8]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                )}
                <div className="bg-[#F5F3F0] rounded-2xl p-6 border border-[#E2DDD8]">
                  <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">notes</span>
                    Evaluation Notes
                  </p>
                  <p className="text-sm text-[#031f22] leading-relaxed font-medium whitespace-pre-wrap">{activeTeam.submittedScores.comment}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16">
            {activeTeam ? (
              <>
                <div className="space-y-6">
                  <TeamProfile team={activeTeam} />
                  {/* Inline contribution teaser */}
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="w-full flex items-center justify-between p-5 bg-white/60 backdrop-blur-sm border border-white shadow-sm rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e8f5ef] flex items-center justify-center text-[#012d1d] group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[20px]">hub</span>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-extrabold text-[#031f22]">GitHub Contributions</span>
                        <span className="block text-xs text-[#6b7280] font-medium mt-0.5">Analyze commits and PRs</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#FAFAF9] flex items-center justify-center group-hover:bg-[#012d1d] group-hover:text-white transition-colors border border-[#E2DDD8] group-hover:border-[#012d1d]">
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </div>
                  </button>
                </div>
                <div>
                  <div className="sticky top-28">
                    <ScoringPanel team={activeTeam} judgeToken={judgeToken} onSubmitted={handleScoreSubmitted} />
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-[#E2DDD8] rotate-3">
                  <div className="w-24 h-24 absolute -rotate-6 bg-[#012d1d]/5 rounded-3xl -z-10" />
                  <span className="material-symbols-outlined text-4xl text-[#a5d0b9]">task</span>
                </div>
                <h3 className="text-2xl font-extrabold text-[#012d1d] tracking-tight">Queue Empty</h3>
                <p className="text-[#6b7280] font-medium mt-2 max-w-sm leading-relaxed">You don't have any teams assigned to evaluate right now, or you have completed all your evaluations.</p>
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
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold z-50 transition-all duration-500 transform translate-y-0 ${toast.type === 'success' ? 'bg-[#012d1d] text-[#a5d0b9] border border-[#024a31]' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}