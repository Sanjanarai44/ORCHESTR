import React from 'react';

export default function TimelineTracker({ countdown, timeline, eventConfig }) {
  const pad = n => String(n).padStart(2, '0');
  const eventName = eventConfig?.event_name || 'Event';

  return (
    <div className="bg-[#dcf9fc] rounded-xl p-8 border border-[#c1c8c2]/20 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-2xl font-bold text-[#012d1d] mb-1">{eventName} Timeline</h2>
          <p className="text-base text-[#414844]">Track your progress through each stage.</p>
        </div>
        <div className="text-right">
          <div className="text-4xl text-[#012d1d] font-bold tabular-nums">
            {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
          </div>
          <p className="text-xs text-[#414844] font-bold uppercase tracking-tighter mt-1">Time Remaining</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-5 left-0 w-full h-[2px] bg-[#c1c8c2]" />
        <div
          className="absolute top-5 left-0 h-[2px] bg-[#012d1d] transition-all duration-700"
          style={{
            width: timeline.length > 0
              ? `${(timeline.filter(s => s.status === 'completed').length / (timeline.length - 1)) * 100}%`
              : '0%'
          }}
        />
        <div className="relative flex justify-between gap-2">
          {timeline?.map((stage, i) => (
            <div key={i} className={`flex flex-col items-center flex-1 ${stage.status === 'pending' ? 'opacity-40' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 z-10 ring-8 ring-[#dcf9fc] transition-all ${
                stage.status === 'active' ? 'w-12 h-12 shadow-lg bg-[#012d1d] text-white scale-110' :
                stage.status === 'completed' ? 'bg-[#012d1d] text-white' :
                'bg-[#cbe8eb] text-[#031f22]'
              }`}>
                <span className={`material-symbols-outlined text-[18px] ${stage.status === 'active' ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '3s' }}>
                  {stage.icon || 'radio_button_checked'}
                </span>
              </div>
              <span className={`text-xs text-center font-medium ${stage.status === 'active' ? 'font-bold text-[#012d1d]' : 'text-[#031f22]'}`}>
                {stage.label}
              </span>
              <span className="text-[10px] text-center text-[#414844] mt-0.5">
                {stage.status === 'active' ? 'In Progress' : stage.status === 'completed' ? 'Done' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}