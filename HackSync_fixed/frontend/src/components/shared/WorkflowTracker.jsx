// src/components/shared/WorkflowTracker.jsx
// Used in BOTH AdminDashboard and ParticipantDashboard
// Props: eventId (string), isAdmin (bool)

import React, { useState, useEffect } from 'react';

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

export default function WorkflowTracker({ eventId, isAdmin = false }) {
  const [workflow, setWorkflow] = useState(null);

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

  const progress =
    workflow.totalStages > 1
      ? (workflow.currentStageIndex / (workflow.totalStages - 1)) * 100
      : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-stone-900">Event Pipeline</h3>
        <span className="text-xs text-stone-500">
          Stage {workflow.currentStageIndex + 1} of {workflow.totalStages}
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
          {workflow.stages.map((stage) => (
            <div key={stage.key} className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 border-white shadow ${statusColor[stage.status]}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {workflow.stages.map((stage) => (
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
            <div className={`w-2 h-2 rounded-full mb-2 ${statusColor[stage.status]}`} />
            <p className="text-xs font-bold text-stone-900">{stage.label}</p>
            <p className="text-[10px] text-stone-500 mt-0.5">{stage.detail}</p>
            <p
              className={`text-[10px] font-semibold mt-1 ${
                stage.status === 'completed'
                  ? 'text-emerald-600'
                  : stage.status === 'in_progress'
                  ? 'text-blue-600'
                  : 'text-stone-400'
              }`}
            >
              {statusLabel[stage.status]}
            </p>
          </div>
        ))}
      </div>

      {/* Admin-only meta row */}
      {isAdmin && workflow.meta && (
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
    </div>
  );
}