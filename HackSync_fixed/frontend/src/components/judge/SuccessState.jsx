import React from 'react';
import JudgeFeedbackForm from './JudgeFeedbackForm';

/**
 * SuccessState — Full-screen completion state shown when all teams are scored.
 * Shown after the last team's scores are submitted.
 */
export default function SuccessState({ judgeName = 'Judge', eventId, judgeId }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="text-center space-y-8 max-w-md">
        
        {/* Animated Checkmark */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-stone-100 rounded-full animate-pulse scale-150 opacity-50" />
          <div className="absolute inset-0 bg-stone-100 rounded-full animate-ping opacity-30" />
          <div className="relative w-20 h-20 bg-stone-900 rounded-full flex items-center justify-center shadow-xl z-10 checkmark-container">
            <svg 
              className="w-10 h-10 text-white"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="3"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M5 13l4 4L19 7" 
                className="checkmark-path"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            All Evaluations Complete
          </h2>
          <p className="text-stone-500 text-sm max-w-[280px] mx-auto leading-relaxed">
            Thank you, {judgeName}. You have successfully submitted scores for all assigned teams.
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-6 text-sm text-stone-600 leading-relaxed border border-stone-100">
          <span className="material-symbols-outlined text-stone-400 text-[18px] align-middle mr-2">info</span>
          The event committee will review all scores and notify you of the final results. You may close this window.
        </div>

        {/* Judge Feedback Form */}
        <div className="mt-8">
          <JudgeFeedbackForm eventId={eventId} judgeId={judgeId} judgeName={judgeName} />
        </div>
      </div>

      <style>{`
        .checkmark-path {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: drawCheck 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          animation-delay: 0.2s;
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        .checkmark-container {
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
