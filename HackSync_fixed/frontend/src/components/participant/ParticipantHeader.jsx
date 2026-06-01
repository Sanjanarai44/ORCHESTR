import React from 'react';

export default function ParticipantHeader({ participant, onLogout }) {
  const initials = participant?.name
    ? participant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="flex justify-between items-center w-full px-16 h-20 bg-[#eafdff]/90 backdrop-blur-md sticky top-0 z-40 border-b border-[#c1c8c2]/20">
      <div className="flex items-center gap-4">
        {participant && (
          <div>
            <p className="text-sm font-bold text-[#012d1d]">{participant.name}</p>
            <p className="text-xs text-[#414844]">{participant.email}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest ${
          participant?.stage === 'evaluation' ? 'bg-amber-100 text-amber-800' :
          participant?.stage === 'final' ? 'bg-emerald-100 text-emerald-800' :
          'bg-[#012d1d]/10 text-[#012d1d]'
        }`}>
          {participant?.stage || 'roster'}
        </span>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs font-bold text-[#414844] hover:text-[#012d1d] px-3 py-2 rounded-xl hover:bg-[#d1edf1] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Switch User
        </button>
        <div className="w-9 h-9 rounded-full bg-[#012d1d] border-2 border-[#c1ecd4] flex items-center justify-center text-[#c1ecd4] text-xs font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}