import React from 'react';

export default function EventJourney({ participant, eventConfig }) {
  const STAGE_MAP = {
    roster: 'registered',
    development: 'development',
    evaluation: 'evaluation',
    demo: 'demo',
    final: 'final',
  };
  const rawStage = participant?.stage || 'roster';
  const currentStage = STAGE_MAP[rawStage] || rawStage;
  const stages = eventConfig?.stages || [];
  const eventName = eventConfig?.event_name || 'Event';

  const stageKeys = ['registered', 'development', 'evaluation', 'demo', 'final'];
  const currentIndex = stageKeys.indexOf(currentStage.toLowerCase());

  const stageLabels = {
    registered: 'Registered',
    development: 'Development',
    evaluation: 'Evaluation',
    demo: 'Demo',
    final: 'Final',
  };

  const currentStageName = stageLabels[currentStage] || currentStage;
  const nextStageName = stageLabels[stageKeys[currentIndex + 1]] || 'Completed';

  const isEarlyStage = currentIndex <= 1;
  const isEvaluation = currentStage === 'evaluation' || currentStage === 'demo';
  const isFinal = currentStage === 'final';
  const submissionStatus =
    currentStage === 'final' ? 'Submitted' :
    currentStage === 'evaluation' || currentStage === 'demo' ? 'Ready to Submit' :
    'In Progress';
  const evaluatorText = isEvaluation ? 'Assigned by committee' : 'Not assigned yet';
  const evaluatorNote = isEvaluation ? 'Your submission is under review' : 'Evaluators will be assigned after submission';
  const advancementRule = eventConfig?.advancement_rule || '';

  return (
    <div className="bg-[#d6f3f7] rounded-xl p-8 border border-[#c1c8c2]/30 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#012d1d]">Your {eventName} Journey</h2>
          <p className="text-sm text-[#414844] mt-1">Track your current progress through each stage</p>
        </div>
        {advancementRule && (
          <span className="text-xs bg-[#012d1d]/10 text-[#012d1d] font-semibold px-3 py-1.5 rounded-full">
            {advancementRule}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Current Stage */}
        <div className="bg-white rounded-xl p-5 border border-[#c1c8c2]/20 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#717973] mb-2">Current Stage</h3>
          <p className="text-lg font-bold text-[#012d1d]">{currentStageName}</p>
          <span className="inline-flex mt-3 bg-[#dff6ea] text-[#012d1d] text-xs font-semibold px-3 py-1 rounded-full">
            {isFinal ? 'Qualified' : 'In Progress'}
          </span>
        </div>

        {/* Evaluator */}
        <div className="bg-white rounded-xl p-5 border border-[#c1c8c2]/20 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#717973] mb-2">Evaluator</h3>
          <p className="text-base font-bold text-[#012d1d]">{evaluatorText}</p>
          <p className="text-xs text-[#414844] mt-2 leading-relaxed">{evaluatorNote}</p>
        </div>

        {/* Upcoming Stage */}
        <div className="bg-white rounded-xl p-5 border border-[#c1c8c2]/20 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#717973] mb-2">Next Stage</h3>
          <p className="text-base font-bold text-[#012d1d]">{nextStageName}</p>
          <p className="text-xs text-[#414844] mt-2">
            {isFinal ? 'You have reached the final stage' : 'Advance by completing current stage'}
          </p>
        </div>

        {/* Submission */}
        <div className="bg-white rounded-xl p-5 border border-[#c1c8c2]/20 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#717973] mb-2">Submission</h3>
          <p className="text-base font-bold text-[#012d1d]">{submissionStatus}</p>
          <p className="text-xs text-[#414844] mt-2">
            {currentIndex <= 1
              ? 'Submission opens at evaluation stage'
              : 'Status updates automatically'}
          </p>
        </div>
      </div>

      {/* Scoring criteria strip if in evaluation */}
      {isEvaluation && eventConfig?.scoring_criteria?.length > 0 && (
        <div className="mt-5 bg-white/60 rounded-xl p-4 border border-[#c1c8c2]/20">
          <p className="text-xs font-bold uppercase tracking-wide text-[#717973] mb-3">You will be scored on</p>
          <div className="flex flex-wrap gap-2">
            {eventConfig.scoring_criteria.map((c, i) => (
              <span key={i} className="text-xs bg-[#012d1d] text-white font-medium px-3 py-1 rounded-full capitalize">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
