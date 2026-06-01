import React from 'react';

/**
 * SuccessState — Full-screen completion state shown when all teams are scored.
 * Shown after the last team's scores are submitted.
 */
export default function SuccessState({ judgeName = 'Judge' }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-md">
        {/* Animated checkmark SVG */}
        <div className="mx-auto">
          <svg
            viewBox="0 0 120 120"
            className="w-32 h-32 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e7f5e9"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#16a34a"
              strokeWidth="8"
              strokeDasharray="339.3"
              strokeDashoffset="0"
              strokeLinecap="round"
              className="animate-[drawCircle_0.8s_ease-out_forwards]"
            />
            <polyline
              points="38,62 54,78 84,44"
              fill="none"
              stroke="#16a34a"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[drawCheck_0.4s_0.5s_ease-out_both]"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            All evaluations complete
          </h1>
          <p className="text-base text-stone-500 leading-relaxed">
            Thank you, <strong className="text-stone-700">{judgeName}</strong>. Your scores have been recorded and will be included in the final leaderboard calculation.
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-6 text-sm text-stone-600 leading-relaxed border border-stone-100">
          <span className="material-symbols-outlined text-stone-400 text-[18px] align-middle mr-2">info</span>
          The event committee will review all scores and notify you of the final results. You may close this window.
        </div>
      </div>

      <style>{`
        @keyframes drawCircle {
          from { stroke-dashoffset: 339.3; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dasharray: 0 100; }
          to   { stroke-dasharray: 100 0; }
        }
      `}</style>
    </div>
  );
}
