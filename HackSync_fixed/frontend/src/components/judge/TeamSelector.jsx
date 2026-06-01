import React from 'react';

/**
 * TeamSelector — horizontal tab bar showing all assigned teams.
 * Unscored: clickable blue highlight on active
 * Scored: green checkmark ✓
 */
export default function TeamSelector({ teams, activeIndex, onSelect }) {
  if (!teams.length) return null;

  return (
    <div className="border-b border-stone-100 bg-white overflow-x-auto">
      <div className="max-w-[820px] mx-auto px-6">
        <div className="flex gap-0 min-w-max">
          {teams.map((team, idx) => {
            const isActive = idx === activeIndex;
            const isScored = team.scored;

            return (
              <button
                key={team.id}
                id={`team-tab-${idx}`}
                onClick={() => onSelect(idx)}
                className={`relative flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-stone-900 text-stone-900'
                    : 'border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-200'
                }`}
              >
                {isScored ? (
                  <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 text-[13px]"
                      style={{ fontVariationSettings: "'wght' 700" }}>
                      check
                    </span>
                  </span>
                ) : (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                {team.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
