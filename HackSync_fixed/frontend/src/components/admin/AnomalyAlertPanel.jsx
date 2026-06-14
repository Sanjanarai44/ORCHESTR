import React, { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../../api';

const API = import.meta.env.VITE_API_URL || 'https://orchestr-ai.onrender.com';
const WS_URL = (API.replace(/^http/, 'ws')) + '/ws/admin';

export default function AnomalyAlertPanel() {
  const [pendingFlags, setPendingFlags] = useState([]);
  const [resolvedFlags, setResolvedFlags] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [resolving, setResolving] = useState({});
  const [recommendations, setRecommendations] = useState({});
  const [recLoading, setRecLoading] = useState({});
  const wsRef = useRef(null);

  // ── Load existing PENDING flags on mount ─────────────────────────────────
  useEffect(() => {
    const loadFlags = async () => {
      try {
        const res = await fetch(`${API}/api/admin/anomaly-flags?status_filter=PENDING`);
        if (res.ok) {
          const data = await res.json();
          setPendingFlags(data.flags || []);
        }
      } catch { }
    };
    const loadResolved = async () => {
      try {
        const res = await fetch(`${API}/api/admin/anomaly-flags?status_filter=RESOLVED`);
        if (res.ok) {
          const data = await res.json();
          setResolvedFlags(data.flags || []);
        }
      } catch { }
    };
    loadFlags();
    loadResolved();
  }, []);

  // ── Fetch AI recommendation per flag ─────────────────────────────────────
  const fetchRecommendation = useCallback(async (flag) => {
    if (recommendations[flag.id] || recLoading[flag.id]) return;
    setRecLoading(prev => ({ ...prev, [flag.id]: true }));
    try {
      const res = await aiApi.explainAnomaly({
        team_name: flag.teamName,
        judge_name: flag.judgeName,
        judge_score: flag.newScore,
        panel_average: flag.panelAvg,
        threshold: 2.0,
      });
      setRecommendations(prev => ({ ...prev, [flag.id]: res }));
    } catch {
      setRecommendations(prev => ({
        ...prev,
        [flag.id]: {
          explanation: flag.llmExplanation,
          recommendation: 'accept',
          recommendation_reason: 'Could not generate recommendation.',
        }
      }));
    } finally {
      setRecLoading(prev => ({ ...prev, [flag.id]: false }));
    }
  }, [recommendations, recLoading]);

  useEffect(() => {
    pendingFlags.forEach(flag => fetchRecommendation(flag));
  }, [pendingFlags]);

  // ── WebSocket subscription ────────────────────────────────────────────────
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const { event: evtName, data } = JSON.parse(event.data);
          if (evtName === 'anomaly:new') {
            setPendingFlags((prev) => [
              { ...data, id: data.flagId, status: 'PENDING' },
              ...prev,
            ]);
          } else if (evtName === 'anomaly:resolved') {
            setPendingFlags((prev) => prev.filter((f) => f.id !== data.flagId));
            setResolvedFlags((prev) => [{ id: data.flagId, resolution: data.resolution }, ...prev]);
          }
        } catch { }
      };

      ws.onclose = () => { setTimeout(connect, 3000); };

      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 30000);

      return () => { clearInterval(ping); ws.close(); };
    };

    const cleanup = connect();
    return () => { cleanup?.(); };
  }, []);

  // ── Resolution handlers ───────────────────────────────────────────────────
  const resolve = useCallback(async (flagId, action, extraBody = {}) => {
    setResolving((prev) => ({ ...prev, [flagId]: true }));
    try {
      const res = await fetch(`${API}/api/anomalies/${flagId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extraBody),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      setPendingFlags((prev) => prev.filter((f) => f.id !== flagId));
      setResolvedFlags((prev) => [{ id: flagId, resolution: action }, ...prev]);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setResolving((prev) => ({ ...prev, [flagId]: false }));
    }
  }, []);

  const handleOverrideSubmit = async () => {
    const score = parseFloat(overrideScore);
    if (!overrideModal || isNaN(score) || score < 1 || score > 10) return;
    await resolve(overrideModal, 'override', { overrideScore: score });
    setOverrideModal(null);
    setOverrideScore('');
  };

  if (pendingFlags.length === 0 && resolvedFlags.length === 0) return null;

  const recColor = (rec) => {
    if (rec === 'discard') return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' };
    if (rec === 'override') return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' };
    return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' };
  };

  return (
    <div className="space-y-3">
      {pendingFlags.map((flag) => {
        const rec = recommendations[flag.id];
        const colors = rec ? recColor(rec.recommendation) : null;

        return (
          <div
            key={flag.id}
            className="bg-white dark:bg-stone-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-5 space-y-4"
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full mt-1.5 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-stone-900 dark:text-white">
                  Anomaly detected — <span className="text-red-600">{flag.teamName}</span> · {flag.judgeName}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Score <strong className="text-stone-700 dark:text-stone-300">{flag.newScore?.toFixed(1)}</strong> vs panel average{' '}
                  <strong className="text-stone-700 dark:text-stone-300">{flag.panelAvg?.toFixed(1)}</strong> · Deviation{' '}
                  <strong className="text-red-600">+{flag.deviation?.toFixed(1)}</strong>
                </p>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl px-4 py-3">
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                <span className="font-bold text-stone-800 dark:text-stone-300">AI Analysis: </span>
                {recLoading[flag.id]
                  ? 'Generating analysis...'
                  : (rec?.explanation || flag.llmExplanation)}
              </p>
            </div>

            {/* AI Recommendation */}
            {rec && !recLoading[flag.id] && (
              <div className={`rounded-xl px-4 py-3 border ${colors.bg} ${colors.border}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${colors.text}`}>
                  AI Recommendation: {rec.recommendation}
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {rec.recommendation_reason}
                </p>
                <button
                  onClick={() => {
                    if (rec.recommendation === 'override') {
                      setOverrideModal(flag.id);
                      setOverrideScore('');
                    } else {
                      resolve(flag.id, rec.recommendation === 'discard' ? 'discard' : 'accept');
                    }
                  }}
                  disabled={resolving[flag.id]}
                  className={`mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all ${colors.btn}`}
                >
                  {resolving[flag.id] ? 'Processing…' : `Apply — ${rec.recommendation}`}
                </button>
              </div>
            )}

            {/* Manual action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => resolve(flag.id, 'accept')}
                disabled={resolving[flag.id]}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {resolving[flag.id] ? 'Processing…' : 'Accept score'}
              </button>
              <button
                onClick={() => resolve(flag.id, 'discard')}
                disabled={resolving[flag.id]}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                Discard score
              </button>
              <button
                onClick={() => { setOverrideModal(flag.id); setOverrideScore(''); }}
                disabled={resolving[flag.id]}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 transition-all"
              >
                Override score
              </button>
            </div>
          </div>
        );
      })}

      {/* Resolved history */}
      {resolvedFlags.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <span>Resolved flags ({resolvedFlags.length})</span>
            <span className={`material-symbols-outlined text-[18px] transition-transform ${historyOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
          {historyOpen && (
            <div className="border-t border-stone-100 dark:border-stone-800 px-5 py-3 space-y-2">
              {resolvedFlags.map((flag) => (
                <div key={flag.id} className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                  <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                  Flag {flag.id?.slice(0, 8)}… resolved as{' '}
                  <strong className="text-stone-700 dark:text-stone-300">{flag.resolution}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Override modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">Override Score</h3>
            <p className="text-xs text-stone-500">Enter a manual score (1–10) for this judge+team combination.</p>
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={overrideScore}
              onChange={(e) => setOverrideScore(e.target.value)}
              placeholder="e.g. 7.5"
              className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleOverrideSubmit}
                className="flex-1 bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
              >
                Apply Override
              </button>
              <button
                onClick={() => setOverrideModal(null)}
                className="flex-1 border border-stone-200 dark:border-stone-700 py-2.5 rounded-xl text-sm font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}