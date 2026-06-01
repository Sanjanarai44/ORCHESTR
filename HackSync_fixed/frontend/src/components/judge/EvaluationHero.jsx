import React from 'react';

export default function EvaluationHero({ countdown, progress, judgeName }) {
  const pad = (num) => num.toString().padStart(2, '0');

  return (
    <>
      <header className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-3xl font-bold text-[#012d1d] tracking-tight">Welcome, {judgeName || 'Judge'}</h2>
          <p className="text-base text-[#414844] mt-2">
            Wise@TI Hackathon — Final Evaluation Stage
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <button className="flex items-center gap-2 px-6 h-[48px] border border-[#717973] rounded-lg text-[#031f22] hover:bg-[#d1edf1] transition-colors text-sm font-medium">
            <span className="material-symbols-outlined">notifications</span>
            Activity
          </button>

          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#012d1d]">
            <img
              alt="User Profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAF9K9Qu4sh-3ipYdxvMVCgVO3hQIL6es_cf_wbjORGPiWrraqfxiybXsupkQEemIy3Q57_iErBjAqdwNHr2qzg36uAYPPakvLIIBr0OAx4hpNy5GLC15YB1P4iVea-FfIzRcFrwMqgLKehR5yZDnwESvtfCDSbcEWT9JBylGxacY8d11ZuRv2BZQNAwH5C2gWkLVW-XHw42014wiTQI7Q2rbrDNTur_4y-l5Y3p8SjkQfrnmUKKduoCw1GakBtZEIhUeH-oP0PEXU"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">

        {/* Progress Card */}
        <div className="col-span-12 lg:col-span-7 bg-[#d6f3f7] p-10 rounded-2xl flex flex-col justify-center border border-[#012d1d]/5">

          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-[#012d1d] flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              Personal Progress
            </h3>

            <span className="text-xs text-[#414844] font-bold uppercase tracking-widest">
              In Progress
            </span>
          </div>

          <div className="flex items-end gap-6 mb-4">

            <span className="text-5xl font-bold text-[#012d1d] leading-none">
              {progress?.evaluated || 0}/{progress?.total || 0}
            </span>

            <div className="flex-1 pb-3">
              <div className="w-full h-3 bg-[#031f22]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#012d1d]"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
            </div>

          </div>

          <p className="text-base text-[#414844]">
            You've evaluated{" "}
            <span className="font-bold">{progress?.percent || 0}%</span> of your assigned teams.
            {" "}Next team:{" "}
            <span className="text-[#012d1d] font-semibold">
              {progress?.nextTeam || "All teams evaluated"}
            </span>
          </p>

        </div>

        {/* Deadline Card (UNCHANGED) */}
        <div className="col-span-12 lg:col-span-5 bg-[#012d1d] text-white p-10 rounded-2xl relative overflow-hidden flex flex-col justify-center shadow-md">

          <div className="relative z-10">
            <h3 className="text-sm opacity-80 uppercase tracking-widest mb-6 font-semibold">
              Round 1 Deadline
            </h3>

            <div className="flex gap-6 items-center">
              <div className="text-center">
                <span className="block text-4xl font-bold">{pad(countdown.hours)}</span>
                <span className="text-xs opacity-60">HRS</span>
              </div>

              <span className="text-4xl opacity-30">:</span>

              <div className="text-center">
                <span className="block text-4xl font-bold">{pad(countdown.minutes)}</span>
                <span className="text-xs opacity-60">MIN</span>
              </div>

              <span className="text-4xl opacity-30">:</span>

              <div className="text-center">
                <span className="block text-4xl font-bold">{pad(countdown.seconds)}</span>
                <span className="text-xs opacity-60">SEC</span>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[140px]">
              schedule
            </span>
          </div>

        </div>
      </div>
    </>
  );
}