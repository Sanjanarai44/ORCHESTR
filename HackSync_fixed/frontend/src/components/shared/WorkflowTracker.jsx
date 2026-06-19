// src/components/shared/WorkflowTracker.jsx
// Used in BOTH AdminDashboard and ParticipantDashboard
// Props: eventId (string), isAdmin (bool)

import React, { useState, useEffect } from 'react';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

function stageIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("registr") || n.includes("roster") || n.includes("intake")) return "how_to_reg";
  if (n.includes("team") || n.includes("form") || n.includes("group")) return "diversity_3";
  if (n.includes("hack") || n.includes("build") || n.includes("develop") || n.includes("code")) return "code";
  if (n.includes("evaluat") || n.includes("review") || n.includes("round") || n.includes("judg")) return "analytics";
  if (n.includes("final") || n.includes("demo") || n.includes("present")) return "workspace_premium";
  if (n.includes("winner") || n.includes("award") || n.includes("result") || n.includes("close")) return "stars";
  if (n.includes("brief") || n.includes("kickoff") || n.includes("welcome")) return "celebration";
  return "fiber_manual_record";
}

const statusColor = {
  completed: 'bg-emerald-500',
  in_progress: 'bg-blue-500 animate-pulse',
  pending: 'bg-stone-300',
};

const statusLabel = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Upcoming',
};

export default function WorkflowTracker({ eventId, isAdmin = false }) {
  const [workflow, setWorkflow] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  const fetchWorkflow = async () => {
    try {
      const res = await fetch(`${NODE}/api/admin/workflow-status?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) setWorkflow(data);
    } catch {
      // silently fail — stale data stays on screen
    }
  };

  useEffect(() => {
    if (!eventId) return;
    fetchWorkflow();
    const interval = setInterval(fetchWorkflow, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [eventId]);

  if (!workflow) return null;

  const stages = workflow.stages || [];
  const currentIndex = workflow.currentStageIndex ?? 0;
  const totalStages = workflow.totalStages ?? stages.length;

  const progress = totalStages > 1
    ? (currentIndex / (totalStages - 1)) * 100
    : 0;

  const handleAdvance = async () => {
    const currentStage = stages[currentIndex];
    const nextStage = stages[currentIndex + 1];
    if (!nextStage) return;

    if (!confirm(`Advance all participants from "${currentStage.label}" → "${nextStage.label}"?\n\nThis updates every participant's stage in the database.`)) return;

    setAdvancing(true);
    try {
      const res = await fetch(`${NODE}/api/admin/advance-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fromStage: currentStage.key,
          toStage: nextStage.key,
        }),
      });
      const data = await res.json();
      alert(`✅ ${data.affected ?? "All"} participant${data.affected !== 1 ? "s" : ""} advanced to ${nextStage.label}`);
      await fetchWorkflow();
    } catch {
      alert("❌ Stage advance failed.");
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-stone-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1B4332] text-[20px]">analytics</span>
          Event Pipeline
        </h3>
        <span className="text-xs text-stone-500">
          Stage {currentIndex + 1} of {totalStages}
        </span>
      </div>

      {/* Progress bar with dots */}
      <div className="relative mb-10">
        <div className="h-1 bg-stone-100 rounded-full">
          <div
            className="h-1 bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="absolute top-0 left-0 right-0 flex justify-between -translate-y-1/2">
          {stages.map((stage) => (
            <div key={stage.key} className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 border-white shadow ${statusColor[stage.status]}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className={`rounded-xl p-3 border transition-all ${
              stage.status === 'in_progress'
                ? 'border-blue-200 bg-blue-50'
                : stage.status === 'completed'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-stone-200 bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[stage.status]}`} />
              <span className="material-symbols-outlined text-stone-400 text-[14px]">
                {stageIcon(stage.label)}
              </span>
            </div>
            <p className="text-xs font-bold text-stone-900">{stage.label}</p>
            <p className="text-[10px] text-stone-500 mt-0.5">{stage.detail}</p>
            <p className={`text-[10px] font-semibold mt-1 ${
              stage.status === 'completed'
                ? 'text-emerald-600'
                : stage.status === 'in_progress'
                ? 'text-blue-600'
                : 'text-stone-400'
            }`}>
              {statusLabel[stage.status]}
            </p>
          </div>
        ))}
      </div>

      {/* Admin-only meta row + advance button */}
      {isAdmin && (
        <>
          {workflow.meta && (
            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-stone-900">{workflow.meta.participantCount}</p>
                <p className="text-[10px] text-stone-500">Participants</p>
              </div>
              <div>
                <p className="text-lg font-bold text-stone-900">{workflow.meta.publishedTeams}</p>
                <p className="text-[10px] text-stone-500">Teams Published</p>
              </div>
              <div>
                <p className="text-lg font-bold text-stone-900">{workflow.meta.judges}</p>
                <p className="text-[10px] text-stone-500">Judges</p>
              </div>
            </div>
          )}

          {/* Advance stage control */}
          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400">
                Current: <span className="font-bold text-stone-700">{stages[currentIndex]?.label || '—'}</span>
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                Move all participants to the next stage
              </p>
            </div>
            <button
              onClick={handleAdvance}
              disabled={advancing || currentIndex >= totalStages - 1}
              className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#14532d] disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              {advancing
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
              {advancing
                ? "Advancing..."
                : `Advance to ${stages[currentIndex + 1]?.label || 'End'}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}