import React from 'react';

export default function EvaluationHero({ countdown, progress, judgeName }) {
  const pad = (num) => num.toString().padStart(2, '0');
  const initials = (judgeName || 'J')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Welcome header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#414844] mb-1">
            Wise@TI · Judge Portal
          </p>
          <h2 className="text-3xl font-bold text-[#012d1d] tracking-tight">
            Welcome, {judgeName || 'Judge'}
          </h2>
        </div>

        {/* Avatar — real initials, no hardcoded image */}
        <div className="w-12 h-12 rounded-full bg-[#012d1d] text-white flex items-center justify-center text-base font-bold shadow-md select-none">
          {initials}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">

        {/* Progress Card */}
        <div className="col-span-12 lg:col-span-7 bg-[#d6f3f7] p-8 rounded-2xl flex flex-col justify-between border border-[#012d1d]/8 min-h-[180px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-[#012d1d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              Personal Progress
            </h3>
            <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              progress?.percent === 100
                ? 'bg-[#bee8dc] text-[#012d1d]'
                : 'bg-[#012d1d]/10 text-[#414844]'
            }`}>
              {progress?.percent === 100 ? 'Complete ✓' : 'In Progress'}
            </span>
          </div>

          <div>
            <div className="flex items-end gap-4 mb-3">
              <span className="text-5xl font-bold text-[#012d1d] leading-none tabular-nums">
                {progress?.evaluated ?? 0}
                <span className="text-2xl font-semibold text-[#012d1d]/50">/{progress?.total ?? 0}</span>
              </span>
              <div className="flex-1 pb-1.5">
                <div className="w-full h-3 bg-[#031f22]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#012d1d] rounded-full transition-all duration-700"
                    style={{ width: `${progress?.percent || 0}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-[#012d1d] pb-1 tabular-nums">
                {progress?.percent ?? 0}%
              </span>
            </div>

            <p className="text-sm text-[#414844]">
              {progress?.percent === 100
                ? 'All teams evaluated — outstanding work!'
                : progress?.nextTeam
                ? <>Next up: <span className="font-semibold text-[#012d1d]">{progress.nextTeam}</span></>
                : 'Loading your assignments…'}
            </p>
          </div>
        </div>

        {/* Deadline timer */}
        <div className="col-span-12 lg:col-span-5 bg-[#012d1d] text-white p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-5">
              Time Remaining
            </h3>

            <div className="flex items-center gap-3">
              {[
                { value: countdown.hours, label: 'HRS' },
                { value: countdown.minutes, label: 'MIN' },
                { value: countdown.seconds, label: 'SEC' },
              ].map(({ value, label }, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <span className="text-3xl opacity-30 mb-4">:</span>}
                  <div className="text-center">
                    <span className="block text-4xl font-bold tabular-nums tracking-tight">
                      {pad(value)}
                    </span>
                    <span className="text-[10px] opacity-50 tracking-widest font-semibold mt-1 block">
                      {label}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Decorative */}
          <div className="absolute -right-3 -bottom-3 opacity-[0.07]">
            <span className="material-symbols-outlined text-[130px]">schedule</span>
          </div>
        </div>

      </div>
    </>
  );
}
