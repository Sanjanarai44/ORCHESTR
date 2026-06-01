import React from 'react';

export default function JudgeResources() {
  const cards = [
    { title: 'Judging Rubric', text: 'Review criteria for technical innovation, UI/UX, and feasibility.', label: 'Download PDF', icon: 'description', actionIcon: 'download' },
    { title: 'Judge Support', text: 'Live chat with organizers for any questions regarding the process.', label: 'Open Support Chat', icon: 'support_agent', actionIcon: 'chat' },
    { title: 'Pitch Archive', text: 'Watch recorded team presentations from the preliminary round.', label: 'Watch Recordings', icon: 'video_library', actionIcon: 'play_circle' },
  ];

  return (
    <>
      <h3 className="text-2xl font-bold text-[#012d1d] mb-8">Judge Resources</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <a key={idx} className="flex flex-col gap-4 p-8 bg-[#d1edf1] rounded-xl hover:shadow-md transition-all duration-300 group border border-stone-200/40" href="#">
            <div className="w-12 h-12 bg-[#1b4332] text-[#86af99] rounded-lg flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <h4 className="text-lg font-bold text-[#012d1d]">{card.title}</h4>
            <p className="text-sm text-[#414844] leading-relaxed">{card.text}</p>
            <span className="mt-auto flex items-center gap-2 text-[#012d1d] text-xs font-bold uppercase tracking-wider">
              {card.label} 
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">{card.actionIcon}</span>
            </span>
          </a>
        ))}
      </div>
    </>
  );
}