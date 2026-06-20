import React from 'react';

const SKILL_COLORS = {
  Frontend: 'bg-[#d6f3f7] text-[#1a5f7a] border-[#a5d0b9]',
  Backend: 'bg-[#bee8dc] text-[#012d1d] border-[#024a31]',
  Designer: 'bg-[#fef3c7] text-[#92400e] border-[#f59e0b]',
  'Full Stack': 'bg-[#e8f5ef] text-[#012d1d] border-[#a5d0b9]',
  'Data Science': 'bg-[#fef9c3] text-[#713f12] border-[#eab308]',
  DevOps: 'bg-[#fee2e2] text-[#991b1b] border-[#ef4444]',
  Mobile: 'bg-[#ede9fe] text-[#5b21b6] border-[#8b5cf6]',
};

function getSkillColor(skill) {
  return SKILL_COLORS[skill] || 'bg-white text-[#012d1d] border-[#E2DDD8]';
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TeamProfile({ team }) {
  const AI_API = import.meta.env.VITE_AI_API_URL || 'https://orchestr-ai.onrender.com';
  const [rubric, setRubric] = React.useState('');
  const [rubricLoading, setRubricLoading] = React.useState(false);

  React.useEffect(() => {
    if (!team) return;
    setRubric('');
    setRubricLoading(true);
    fetch(`${AI_API}/generate-rubric`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName: team.name, projectDescription: team.description || team.project || '' })
    })
    .then(res => res.json())
    .then(data => {
      setRubric(data.rubric || 'Could not generate rubric.');
      setRubricLoading(false);
    })
    .catch(err => {
      console.error(err);
      setRubric('Error generating rubric.');
      setRubricLoading(false);
    });
  }, [team, AI_API]);

  if (!team) return null;

  return (
    <div className="space-y-6">
      {/* Team name */}
      <div>
        <h2 className="text-3xl font-extrabold text-[#012d1d] tracking-tight">{team.name}</h2>
        <p className="text-sm font-medium text-[#6b7280] mt-1">Evaluating Team Portfolio</p>
      </div>

      {/* Members */}
      <div className="space-y-3">
        {(team.members || []).map((member, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/70 backdrop-blur-md hover:bg-white border border-[#E2DDD8] hover:border-[#a5d0b9] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#012d1d] to-[#024a31] text-[#a5d0b9] rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {getInitials(member.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-[#012d1d] truncate tracking-wide">{member.name}</p>
              <p className="text-xs font-medium text-[#6b7280] truncate mt-0.5">{member.college}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase flex-shrink-0 border ${getSkillColor(
                member.skill
              )}`}
            >
              {member.skill}
            </span>
          </div>
        ))}
      </div>

      {/* Problem statement */}
      {team.problemStatement && (
        <div className="bg-white/70 backdrop-blur-md border border-[#E2DDD8] shadow-sm rounded-3xl p-6">
          <p className="text-[11px] font-extrabold text-[#6b7280] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">lightbulb</span>
            Problem Statement
          </p>
          <p className="text-sm text-[#031f22] leading-relaxed font-semibold">{team.problemStatement}</p>
        </div>
      )}

      {/* Evaluation guide (LLM-generated hints from T1) */}
      {team.evaluationGuide && (
        <div className="rounded-3xl p-6 border border-[#a5d0b9]/60 bg-gradient-to-br from-[#d6f3f7]/50 to-[#e8f5ef]/50 backdrop-blur-md shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#a5d0b9]/30 rounded-full blur-xl -mr-10 -mt-10" />
          <p className="text-[11px] font-extrabold text-[#012d1d] uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-[16px]">rule</span>
            Evaluation Guide
          </p>
          <p className="text-sm text-[#031f22] leading-relaxed font-semibold relative z-10">{team.evaluationGuide}</p>
        </div>
      )}
      
      {/* AI Rubric Panel */}
      <div className="bg-white shadow-xl border border-[#E2DDD8] rounded-3xl p-6 space-y-4 relative overflow-hidden group transition-all hover:shadow-2xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#a5d0b9]/10 rounded-full blur-3xl group-hover:bg-[#a5d0b9]/20 transition-colors pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10 border-b border-[#E2DDD8]/50 pb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#012d1d] to-[#024a31] flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[#a5d0b9] text-[16px]">smart_toy</span>
          </div>
          <p className="text-sm font-extrabold text-[#012d1d] tracking-wide">AI Suggested Rubric</p>
        </div>
        {rubricLoading ? (
          <div className="space-y-3 animate-pulse relative z-10 pt-2">
            <div className="h-2.5 bg-[#E2DDD8] rounded-full w-3/4"></div>
            <div className="h-2.5 bg-[#E2DDD8] rounded-full w-5/6"></div>
            <div className="h-2.5 bg-[#E2DDD8] rounded-full w-1/2"></div>
          </div>
        ) : (
          <div className="text-[13px] text-[#414844] leading-relaxed whitespace-pre-wrap font-medium font-mono bg-[#FAFAF9] p-4 rounded-2xl border border-[#E2DDD8] relative z-10">
            {rubric}
          </div>
        )}
      </div>

    </div>
  );
}
