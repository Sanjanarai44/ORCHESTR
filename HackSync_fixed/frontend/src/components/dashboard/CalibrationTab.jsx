import React, { useState, useEffect } from 'react';

const NODE_URL = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

export default function CalibrationTab({ eventConfig, eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [zscoreEnabled, setZscoreEnabled] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState(2.0);
  const [viewMode, setViewMode] = useState('judges'); // 'judges' | 'leaderboard'

  const fetchData = async (silent = false) => {
    if (!eventId) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${NODE_URL}/api/admin/calibration/judge-calibration-report?eventId=${eventId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setZscoreEnabled(json.zScoreNormalisationEnabled);
      }
      
      const threshRes = await fetch(`${NODE_URL}/api/admin/calibration/settings/anomaly-threshold?eventId=${eventId}`);
      const threshJson = await threshRes.json();
      if (threshJson.success) setAnomalyThreshold(threshJson.anomalyThreshold);

      const lbRes = await fetch(`${NODE_URL}/api/admin/calibration/leaderboard/comparison?eventId=${eventId}`);
      const lbJson = await lbRes.json();
      if (lbJson.success) {
        setLeaderboardData(lbJson);
      }
    } catch (err) {
      console.error('Failed to fetch calibration data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh data silently every 5 seconds so background tasks magically appear
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [eventId]);

  const handleThresholdChange = (e) => {
    setAnomalyThreshold(e.target.value);
  };

  const handleThresholdBlur = async () => {
    const num = parseFloat(anomalyThreshold);
    if (isNaN(num)) return;
    try {
      await fetch(`${NODE_URL}/api/admin/calibration/settings/anomaly-threshold?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: num })
      });
    } catch (err) {
      alert("Failed to update threshold");
    }
  };

  const handleToggleZScore = async () => {
    const newVal = !zscoreEnabled;
    try {
      setZscoreEnabled(newVal);
      await fetch(`${NODE_URL}/api/admin/calibration/settings/zscore-normalisation?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newVal })
      });
      fetchData(); // refresh leaderboards
    } catch (err) {
      alert("Failed to toggle setting");
      setZscoreEnabled(!newVal);
    }
  };

  const handleGenerateSummaries = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${NODE_URL}/api/admin/calibration/judge-calibration-report/generate-summaries?eventId=${eventId}`, {
        method: 'POST'
      });
      const json = await res.json();
      await fetchData(); // refresh leaderboard and summaries
      const count = json.triggered ?? 0;
      alert(`✅ AI summaries generated for ${count} judge${count !== 1 ? 's' : ''}.`);
    } catch (err) {
      alert("❌ Failed to generate summaries.");
    }
    setIsGenerating(false);
  };

  const handlePostNormalisationCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${NODE_URL}/api/admin/calibration/run-post-normalisation-check?eventId=${eventId}`, {
        method: 'POST'
      });
      const json = await res.json();
      alert(`✅ ${json.message}`);
    } catch (err) {
      alert("❌ Failed to run anomaly check.");
    }
    setIsChecking(false);
  };

  if (loading) {
    return <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-sm text-stone-400">Loading calibration data...</p></div>;
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto text-stone-800 dark:text-stone-200">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/60 dark:border-stone-800/60 pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">Calibration & Normalisation</h2>
          <p className="text-sm text-stone-500 mt-1">Review judge bias, trigger AI summaries, and analyze leaderboard impact.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-stone-900 px-4 py-2 rounded-xl border border-stone-200/60 dark:border-stone-800">
            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Anomaly Threshold:</span>
            <input 
              type="number" 
              step="0.1" 
              min="0.5" 
              max="5.0"
              value={anomalyThreshold}
              onChange={handleThresholdChange}
              onBlur={handleThresholdBlur}
              className="w-16 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-sm font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-stone-900 px-4 py-2 rounded-xl border border-stone-200/60 dark:border-stone-800">
            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Z-Score Normalisation</span>
            <button 
              onClick={handleToggleZScore}
              className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${zscoreEnabled ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'}`}
            >
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${zscoreEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      {data && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Global Average</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-white">{data.globalAvg}</p>
            <p className="text-xs text-stone-400">Overall panel baseline</p>
          </div>
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Total Evaluations</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-white">{data.totalEvaluations}</p>
            <p className="text-xs text-stone-400">Used for baseline calculation</p>
          </div>
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Active Judges</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-white">{data.totalJudges}</p>
            <p className="text-xs text-stone-400">Analyzed for bias</p>
          </div>
          <div className="bg-stone-950 p-5 rounded-2xl border border-stone-900 space-y-1 flex flex-col justify-center">
             <button onClick={handlePostNormalisationCheck} disabled={isChecking}
              className="w-full bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-950 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
              {isChecking ? <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">policy</span>}
              Run Anomaly Check
            </button>
            <p className="text-[10px] text-stone-400 text-center mt-1">
              {data.lastAnomalyCheckResult ? data.lastAnomalyCheckResult : "Batch check normalised scores"}
            </p>
          </div>
        </section>
      )}

      {/* Tabs for content */}
      <div className="flex gap-4 border-b border-stone-200/60 dark:border-stone-800/60">
        <button 
          onClick={() => setViewMode('judges')}
          className={`pb-2 text-sm font-bold border-b-2 transition-colors ${viewMode === 'judges' ? 'border-stone-900 dark:border-white text-stone-900 dark:text-white' : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          Judge Bias Report
        </button>
        <button 
          onClick={() => setViewMode('leaderboard')}
          className={`pb-2 text-sm font-bold border-b-2 transition-colors ${viewMode === 'leaderboard' ? 'border-stone-900 dark:border-white text-stone-900 dark:text-white' : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          Leaderboard Impact
        </button>
      </div>

      {viewMode === 'judges' && data && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">AI Calibration Summaries</h3>
            <button onClick={handleGenerateSummaries} disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all">
              {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">psychology</span>}
              {isGenerating ? 'Generating...' : 'Generate Summaries'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.judges.length === 0 ? (
              <div className="col-span-1 md:col-span-2 py-12 text-center bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-700 mb-2 block">gavel</span>
                <p className="text-stone-500 dark:text-stone-400 font-medium">No evaluations have been submitted yet.</p>
                <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">Judge bias reports will appear here once scoring begins.</p>
              </div>
            ) : (
              data.judges.map(j => (
              <div key={j.judgeId} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/60 dark:border-stone-800 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-900 dark:bg-stone-700 flex items-center justify-center text-white font-bold text-sm">
                      {j.judgeName.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-white">{j.judgeName}</p>
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Avg: {j.avgScore.toFixed(2)} · StdDev: {j.stdDev.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                      j.biasLabel === 'Harsh' ? 'bg-red-100 text-red-700' :
                      j.biasLabel === 'Lenient' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}>
                      {j.biasLabel}
                    </span>
                  </div>
                </div>

                {j.llmSummary ? (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-3">
                    <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">{j.llmSummary}</p>
                  </div>
                ) : (
                  <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-stone-400">No AI summary generated yet.</p>
                  </div>
                )}
                
                <div className="flex justify-between text-xs text-stone-500 font-medium">
                  <span>Evaluations: {j.scoresByTeam.length}</span>
                  {j.anomalyCount > 0 && <span className="text-amber-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> {j.anomalyCount} Flags</span>}
                </div>
              </div>
            )))}
          </div>
        </section>
      )}

      {viewMode === 'leaderboard' && leaderboardData && (
        <section className="space-y-4">
          {leaderboardData.significantChanges.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 mb-4">
              <h3 className="font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined">swap_vert</span> Significant Ranking Shifts
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-400/80 mb-3">
                Normalisation caused {leaderboardData.significantChanges.length} teams to shift ranks.
              </p>
              <div className="flex flex-wrap gap-2">
                {leaderboardData.significantChanges.map(sc => (
                  <span key={sc.teamId} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg font-semibold">
                    {sc.teamName}: {sc.rawRank} → {sc.normalisedRank}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/60 dark:border-stone-800 overflow-hidden">
            {leaderboardData.rawLeaderboard.length === 0 || data.totalEvaluations === 0 ? (
              <div className="py-12 text-center bg-stone-50 dark:bg-stone-900/50">
                <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-700 mb-2 block">leaderboard</span>
                <p className="text-stone-500 dark:text-stone-400 font-medium">No leaderboard data available.</p>
                <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">Teams and their rankings will appear here once evaluations begin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800">
                    <th className="px-6 py-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10px]">Team</th>
                    <th className="px-6 py-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10px]">Raw Score</th>
                    <th className="px-6 py-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10px]">Raw Rank</th>
                    <th className="px-6 py-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10px]">Normalised Score</th>
                    <th className="px-6 py-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10px]">Normalised Rank</th>
                    <th className="px-6 py-4 font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10px]">Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {leaderboardData.rawLeaderboard.map(rt => {
                    const nt = leaderboardData.normalisedLeaderboard.find(t => t.teamId === rt.teamId);
                    const shift = rt.rank - (nt ? nt.rank : rt.rank);
                    
                    return (
                      <tr key={rt.teamId} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-stone-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {rt.teamName}
                            {rt.resultsHeld && <span className="material-symbols-outlined text-[14px] text-amber-500" title="Results Held">lock</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-stone-600 dark:text-stone-300">{rt.total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-stone-900 dark:text-white font-bold">#{rt.rank}</td>
                        <td className="px-6 py-4 text-stone-600 dark:text-stone-300">{nt ? nt.total.toFixed(2) : '-'}</td>
                        <td className="px-6 py-4 text-stone-900 dark:text-white font-bold">#{nt ? nt.rank : '-'}</td>
                        <td className="px-6 py-4">
                          {shift > 0 ? (
                            <span className="text-emerald-600 font-bold flex items-center text-xs"><span className="material-symbols-outlined text-[14px]">arrow_upward</span> {shift}</span>
                          ) : shift < 0 ? (
                            <span className="text-red-600 font-bold flex items-center text-xs"><span className="material-symbols-outlined text-[14px]">arrow_downward</span> {Math.abs(shift)}</span>
                          ) : (
                            <span className="text-stone-400 font-bold text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
