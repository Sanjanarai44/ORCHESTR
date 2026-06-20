import React, { useState } from 'react';

const statusConfig = {
  scored: {
    bg: 'bg-[#bee8dc]',
    text: 'text-[#012d1d]',
    dot: 'bg-[#012d1d]',
    label: 'Scored',
  },
  active: {
    bg: 'bg-[#d6f3f7]',
    text: 'text-[#1a5f7a]',
    dot: 'bg-[#378add]',
    label: 'In Review',
  },
  pending: {
    bg: 'bg-stone-100',
    text: 'text-stone-500',
    dot: 'bg-stone-400',
    label: 'Pending',
  },
};

function StatusBadge({ scored, active }) {
  const cfg = scored ? statusConfig.scored : active ? statusConfig.active : statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function EvaluationQueue({
  teams = [],
  selectedTeam,
  teamScores = {},
  onSelectTeam,
  onRefresh,
}) {
  const [search, setSearch] = useState('');

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const isScored = (team) => team.scored || (teamScores?.[team.id]?.length > 0);

  // Real score from submitted scores — never mock
  const getMyScore = (team) => {
    if (team.submittedScores) {
      const { code, innovation, presentation } = team.submittedScores;
      if (code != null && innovation != null && presentation != null) {
        return ((code + innovation + presentation) / 3).toFixed(1);
      }
    }
    const scores = teamScores?.[team.id];
    if (scores?.length > 0 && scores[0]?.score != null) {
      return scores[0].score.toFixed(1);
    }
    return null;
  };

  const scoredCount = teams.filter((t) => isScored(t)).length;
  const totalCount = teams.length;
  const percent = totalCount ? Math.round((scoredCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#012d1d] tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">groups</span>
            Evaluation Queue
          </h2>
          <p className="text-sm text-[#414844] mt-1">
            Your assigned teams — score each one before the deadline
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#717973] rounded-lg text-sm font-medium text-[#031f22] hover:bg-[#d1edf1] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>


      {/* Team list */}
      <div className="bg-white rounded-2xl border border-[#012d1d]/10 overflow-hidden">
        {/* Table header row with search */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#012d1d]/8 bg-[#F5F3F0]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#414844]">
            {filteredTeams.length} Teams
          </p>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#414844]">
              search
            </span>
            <input
              type="text"
              placeholder="Search teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm bg-white border border-[#717973]/40 rounded-lg text-[#031f22] placeholder-[#414844]/60 focus:outline-none focus:ring-2 focus:ring-[#012d1d]/30 w-52 transition"
            />
          </div>
        </div>

        {/* Team rows */}
        <div className="divide-y divide-[#012d1d]/6">
          {filteredTeams.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-[#414844]/40 block mb-2">search_off</span>
              <p className="text-sm text-[#414844]">No teams match your search</p>
            </div>
          ) : (
            filteredTeams.map((team, idx) => {
              const scored = isScored(team);
              const active = selectedTeam?.id === team.id;
              const myScore = getMyScore(team);
              const members = team.members || [];

              return (
                <div
                  key={team.id}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    active ? 'bg-[#d6f3f7]' : scored ? 'bg-[#F5F3F0]/60' : 'hover:bg-[#F5F3F0]/80'
                  }`}
                >
                  {/* Index */}
                  <div className="w-7 h-7 rounded-full bg-[#012d1d]/8 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#012d1d]">{idx + 1}</span>
                  </div>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#012d1d] truncate">{team.name}</p>
                      {active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#012d1d] text-white rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {members.length > 0 && (
                      <p className="text-xs text-[#414844] mt-0.5 truncate">
                        {members.slice(0, 3).map((m) => m.name).join(' · ')}
                        {members.length > 3 && ` +${members.length - 3}`}
                      </p>
                    )}
                  </div>

                  {/* My score — real only, never mocked */}
                  <div className="w-24 text-center flex-shrink-0">
                    {myScore != null ? (
                      <div>
                        <p className="text-lg font-bold text-[#012d1d]">{myScore}</p>
                        <p className="text-[10px] text-[#414844] font-medium">/ 10 · your score</p>
                      </div>
                    ) : (
                      <span className="text-sm text-[#414844]/50">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="w-28 flex justify-center flex-shrink-0">
                    <StatusBadge scored={scored} active={active} />
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => onSelectTeam(team)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        active
                          ? 'bg-[#012d1d] text-white cursor-default'
                          : scored
                          ? 'border border-[#717973] text-[#031f22] hover:bg-[#d1edf1]'
                          : 'bg-[#012d1d] text-white hover:bg-[#014a31]'
                      }`}
                    >
                      {active ? 'Scoring…' : scored ? 'Re-score' : 'Evaluate'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Done callout */}
      {scoredCount === totalCount && totalCount > 0 && (
        <div className="bg-[#bee8dc] border border-[#012d1d]/20 rounded-2xl px-6 py-5 flex items-center gap-4">
          <span className="material-symbols-outlined text-[#012d1d] text-3xl">check_circle</span>
          <div>
            <p className="text-base font-bold text-[#012d1d]">All teams evaluated!</p>
            <p className="text-sm text-[#414844] mt-0.5">
              You've submitted scores for all {totalCount} assigned teams. Thank you!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
