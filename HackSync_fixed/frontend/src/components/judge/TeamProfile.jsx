import React from 'react';

const SKILL_COLORS = {
  Frontend: 'bg-blue-100 text-blue-800',
  Backend: 'bg-purple-100 text-purple-800',
  Designer: 'bg-pink-100 text-pink-800',
  'Full Stack': 'bg-indigo-100 text-indigo-800',
  'Data Science': 'bg-amber-100 text-amber-800',
  DevOps: 'bg-orange-100 text-orange-800',
  Mobile: 'bg-teal-100 text-teal-800',
};

function getSkillColor(skill) {
  return SKILL_COLORS[skill] || 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300';
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * TeamProfile — Left column of the evaluation layout.
 * Shows team members, problem statement, and evaluation guide.
 */
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
    <div className="space-y-5">
      {/* Team name */}
      <h2 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">{team.name}</h2>

      {/* Members */}
      <div className="space-y-2.5">
        {(team.members || []).map((member, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 hover:bg-stone-100 dark:bg-stone-900 transition-colors"
          >
            <div className="w-9 h-9 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(member.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">{member.name}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 dark:text-stone-500 truncate">{member.college}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 ${getSkillColor(
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
        <div className="bg-stone-50 dark:bg-stone-900/50 rounded-xl p-4 border border-stone-200 dark:border-stone-800/50 dark:border-stone-800/50">
          <p className="text-xs font-bold text-stone-500 dark:text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
            Problem Statement
          </p>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{team.problemStatement}</p>
        </div>
      )}

      {/* Evaluation guide (LLM-generated hints from T1) */}
      {team.evaluationGuide && (
        <div className="rounded-xl p-4 border-l-4 border-blue-500 bg-blue-50">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
            Evaluation Guide
          </p>
          <p className="text-sm text-blue-900 leading-relaxed">{team.evaluationGuide}</p>
        </div>
      )}
      {/* AI Rubric Panel */}
      <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800/50 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-stone-600 dark:text-stone-400 dark:text-stone-500 text-[18px]">smart_toy</span>
          <p className="text-sm font-bold text-stone-900 dark:text-white">AI Suggested Rubric</p>
        </div>
        {rubricLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-3/4"></div>
            <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-5/6"></div>
            <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="text-xs text-stone-600 dark:text-stone-400 dark:text-stone-500 leading-relaxed whitespace-pre-wrap font-medium font-mono bg-white dark:bg-stone-950 p-3 rounded-lg border border-stone-200 dark:border-stone-800/50 dark:border-stone-800/50">
            {rubric}
          </div>
        )}
      </div>

    </div>
  );
}
