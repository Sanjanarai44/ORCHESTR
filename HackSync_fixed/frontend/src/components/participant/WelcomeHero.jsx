import React from 'react';

export default function WelcomeHero({
  participant,
  notifications = []
}) {
  const getStageMessage = () => {
    switch (participant?.stage?.toLowerCase()) {
      case 'development':
        return 'Keep building!';

      case 'evaluation':
        return 'Your project is under evaluation.';

      case 'final':
        return 'Congratulations! You advanced to the next stage.';

      case 'ideation':
        return 'Your hackathon journey has started.';

      default:
        return 'Stay tuned for updates.';
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-[#012d1d]';

      case 'warning':
        return 'border-[#c58b00]';

      case 'info':
        return 'border-[#1b4332]';

      case 'danger':
        return 'border-[#ba1a1a]';

      default:
        return 'border-[#717973]';
    }
  };
const formatSkill = (skill) => {
  if (!skill) return '';

  switch (skill.toLowerCase()) {
    case 'ml and python':
      return 'Machine Learning & Python Developer';

    case 'react and frontend':
      return 'Frontend Developer (React)';

    case 'backend and database':
      return 'Backend & Database Developer';

    default:
      return skill;
  }
};
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Welcome Banner */}
      <div className="lg:col-span-2 bg-[#1b4332] rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group min-h-[280px] shadow-sm">
        <div className="relative z-10">
          <span className="text-sm font-semibold text-[#c1ecd4] uppercase tracking-widest mb-4 block">
            Current Status:{' '}
            {participant?.stage || 'Not Started'}
          </span>

          <h1 className="text-5xl font-bold text-[#eafdff] mb-4 leading-tight">
            Welcome back,
            <br />
            {participant?.name || 'Participant'}!
          </h1>

          <p className="text-lg text-[#86af99] max-w-lg mb-8 opacity-95">
            {participant?.skill ? (
              <>
                <p className="text-lg text-[#86af99] max-w-lg mb-8 opacity-95">
  <span className="font-semibold text-white">
    {formatSkill(participant.skill)}
  </span>
  <span> • {getStageMessage()}</span>
</p>
              </>
            ) : (
              'Your project journey is underway.'
            )}
          </p>

          <button className="bg-[#eafdff] text-[#012d1d] px-8 py-3 rounded-lg font-semibold hover:bg-white transition-all transform active:scale-95 flex items-center gap-3 shadow-md">
            <span className="material-symbols-outlined">
              upload_file
            </span>
            Submit Project
          </button>
        </div>

        <div className="absolute right-[-10%] bottom-[-20%] opacity-10 group-hover:scale-110 transition-transform duration-700">
          <span
            className="material-symbols-outlined text-[320px]"
            style={{
              fontVariationSettings:
                "'wght' 200"
            }}
          >
            architecture
          </span>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-[#d6f3f7] rounded-xl p-6 flex flex-col h-full border border-[#c1c8c2]/30 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#031f22] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#012d1d]">
              campaign
            </span>
            Live Feed
          </h2>

          <span className="w-2 h-2 bg-[#ba1a1a] rounded-full animate-pulse"></span>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">

          {notifications.length > 0 ? (
            notifications.map(
              (item, idx) => (
                <div
                  key={idx}
                  className={`p-3 bg-[#eafdff] rounded-lg border-l-4 shadow-sm ${getBorderColor(
                    item.type
                  )}`}
                >
                  <p className="text-sm font-medium text-[#031f22] mb-1">
                    {item.message}
                  </p>

                  <span className="text-xs text-[#414844]">
                    {item.time ||
                      'Recently'}
                  </span>
                </div>
              )
            )
          ) : (
            <div className="text-sm text-[#414844]">
              No announcements yet.
            </div>
          )}
        </div>

        <button className="mt-auto pt-4 text-[#012d1d] text-sm font-bold hover:underline text-left">
          View all announcements →
        </button>
      </div>
    </div>
  );
}