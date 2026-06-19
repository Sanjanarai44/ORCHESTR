import React, { useState, useEffect } from "react";
import { feedbackApi, aiApi } from "../../api";

export default function FeedbackTab({ eventId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [eventId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await feedbackApi.getStats(eventId || 1);
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to fetch feedback stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesize = async () => {
    if (!stats || !stats.openTexts || stats.openTexts.length === 0) {
      alert("No open text responses available to synthesize.");
      return;
    }

    setSynthesizing(true);
    try {
      const res = await aiApi.synthesizeFeedback(stats.openTexts);
      setSynthesisResult(res.summary);
    } catch (err) {
      console.error("Synthesis failed:", err);
      alert("Failed to synthesize feedback.");
    } finally {
      setSynthesizing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-6 h-6 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-stone-500">Loading feedback data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-stone-500">Failed to load feedback stats.</p>
        <button onClick={fetchStats} className="text-xs font-bold text-[#1B4332] mt-2 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Post-Event Feedback</h2>
          <p className="text-sm text-stone-500 mt-1">Live insights from participants and judges</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors">
          <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Total Responses</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{stats.total}</p>
          <div className="flex gap-4 mt-2 text-xs text-stone-500">
            <span><strong className="text-stone-700">{stats.participantCount}</strong> Participants</span>
            <span><strong className="text-stone-700">{stats.judgeCount}</strong> Judges</span>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm md:col-span-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 mb-3">Overall Rating Distribution</p>
          <div className="flex items-end gap-6 h-[50px]">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-[#1B4332] leading-none">{stats.averageStar}</span>
              <span className="text-xs font-bold text-stone-400">Average</span>
            </div>
            
            <div className="flex-1 flex items-end gap-2 h-full">
              {[1, 2, 3, 4, 5].map(star => {
                const count = stats.starCounts[star] || 0;
                const max = Math.max(...Object.values(stats.starCounts), 1);
                const heightPct = (count / max) * 100;
                return (
                  <div key={star} className="flex-1 flex flex-col justify-end items-center gap-1 h-full group">
                    <div className="w-full bg-[#eafdff] rounded-sm relative overflow-hidden transition-all duration-500 group-hover:bg-[#c1ecd4]" style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0' }}>
                      {count > 0 && <div className="absolute inset-x-0 bottom-0 top-0 bg-[#1B4332] opacity-20"></div>}
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">{star} ★</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yes/No Metrics */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-stone-400">checklist</span>
            Experience Breakdown
          </h3>
          
          <div className="space-y-6">
            {[
              { label: "Was the event timeline clear?", pct: stats.percentages.timelineClear, audience: "Participants" },
              { label: "Did you find the AI mentor useful?", pct: stats.percentages.aiMentorUseful, audience: "Participants" },
              { label: "Would you participate again?", pct: stats.percentages.participateAgain, audience: "Participants" },
              { label: "Were the evaluation criteria clear?", pct: stats.percentages.criteriaClear, audience: "Judges" }
            ].map((metric, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{metric.label}</p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide mt-0.5">{metric.audience}</p>
                  </div>
                  <span className="text-sm font-bold text-stone-900">{metric.pct}% Yes</span>
                </div>
                <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1B4332] rounded-full transition-all duration-1000" style={{ width: `${metric.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Synthesis */}
        <div className="bg-gradient-to-br from-[#f8edff] to-[#f4e6ff] rounded-2xl border border-[#eaccff] shadow-sm p-6 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#4a1c6f] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                AI Feedback Synthesis
              </h3>
              <p className="text-xs text-[#703b9b] mt-1 max-w-[280px]">
                AI analyzes all open text responses ({stats.openTexts?.length || 0}) to extract the top 3 recurring themes.
              </p>
            </div>
            
            <button
              onClick={handleSynthesize}
              disabled={synthesizing || !stats.openTexts || stats.openTexts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#6b21a8] hover:bg-[#581c87] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              {synthesizing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">summarize</span>
              )}
              {synthesizing ? "Synthesizing..." : "Synthesize Themes"}
            </button>
          </div>

          <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 p-5 mt-2">
            {synthesisResult ? (
              <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed prose prose-sm prose-stone">
                {synthesisResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 text-[#703b9b]/60">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-50">forum</span>
                <p className="text-sm font-medium">Click "Synthesize Themes" to run analysis on all qualitative feedback.</p>
                <p className="text-xs mt-1">Runs on-demand to save costs.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
