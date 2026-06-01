import React, { useState } from 'react';

const statusBadge = (scored, active) => {
  if (scored) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#eaf3de', color: '#3b6d11',
      fontSize: 12, fontWeight: 500,
      padding: '3px 10px', borderRadius: 20,
      border: '0.5px solid #c0dd97'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#639922', display: 'inline-block' }} />
      Scored
    </span>
  );
  if (active) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#e6f1fb', color: '#185fa5',
      fontSize: 12, fontWeight: 500,
      padding: '3px 10px', borderRadius: 20,
      border: '0.5px solid #b5d4f4'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#378add', display: 'inline-block' }} />
      In Scoring
    </span>
  );
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#f1efe8', color: '#5f5e5a',
      fontSize: 12, fontWeight: 500,
      padding: '3px 10px', borderRadius: 20,
      border: '0.5px solid #d3d1c7'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#888780', display: 'inline-block' }} />
      Pending
    </span>
  );
};

export default function EvaluationQueue({
  teams = [],
  selectedTeam,
  teamScores = {},
  onSelectTeam,
  onSubmitScore
}) {
  const [search, setSearch] = useState('');
  const [score, setScore] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [rubric, setRubric] = useState(null);
  const [rubricLoading, setRubricLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const isScored = (teamId) => teamScores?.[teamId]?.length > 0;

  const getScores = (teamId) => teamScores?.[teamId] || [];

  const getAverage = (teamId) => {
    const scores = getScores(teamId);
    if (!scores.length) return null;
    return (scores.reduce((s, x) => s + x.score, 0) / scores.length).toFixed(1);
  };

  const getAnomalies = (teamId) => {
    const scores = getScores(teamId);
    if (scores.length < 2) return [];
    const avg = scores.reduce((s, x) => s + x.score, 0) / scores.length;
    return scores.filter(s => Math.abs(s.score - avg) > 2.0);
  };

  const handleSelectTeam = async (team) => {
    onSelectTeam(team);
    setRubric(null);
    setSubmitError('');
    setScore('');

    setRubricLoading(true);
    try {
      const res = await fetch('/generate-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: team.name,
          challenge: team.rationale || team.scope || 'Hackathon project'
        })
      });
      const data = await res.json();
      setRubric(data.rubric);
    } catch {
      setRubric(null);
    }
    setRubricLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedTeam || !score || !judgeName.trim()) {
      setSubmitError('Please enter your name and a score.');
      return;
    }
    const n = Number(score);
    if (isNaN(n) || n < 0 || n > 10) {
      setSubmitError('Score must be between 0 and 10.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmitScore?.(judgeName.trim(), n);
      setScore('');
    } catch {
      setSubmitError('Submission failed. Try again.');
    }
    setSubmitting(false);
  };

  const anomaliesForSelected = selectedTeam ? getAnomalies(selectedTeam.id) : [];

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      borderRadius: 16,
      border: '0.5px solid var(--color-border-tertiary)',
      overflow: 'hidden'
    }}>

      {/* HEADER */}
      <div style={{
        padding: '28px 32px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>
            Evaluation Queue
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Primary scoring dashboard for your assigned teams
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            style={{
              padding: '8px 12px 8px 34px',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              width: 200
            }}
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--color-background-secondary)' }}>
              {['Team', 'Scope', 'Avg Score', 'Status', 'Action'].map(h => (
                <th key={h} style={{
                  padding: '10px 24px', textAlign: h === 'Action' ? 'right' : 'left',
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTeams.length === 0 ? (
              <tr>
                <td colSpan={5} style={{
                  padding: '40px 24px', textAlign: 'center',
                  color: 'var(--color-text-secondary)', fontSize: 14
                }}>
                  No teams found
                </td>
              </tr>
            ) : filteredTeams.map((team) => {
              const active = selectedTeam?.id === team.id;
              const scored = isScored(team.id);
              const avg = getAverage(team.id);

              return (
                <tr key={team.id} style={{
                  borderTop: '0.5px solid var(--color-border-tertiary)',
                  background: active ? 'var(--color-background-info)' : 'transparent',
                  transition: 'background 0.15s'
                }}>
                  <td style={{ padding: '14px 24px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {team.name}
                  </td>
                  <td style={{
                    padding: '14px 24px', color: 'var(--color-text-secondary)',
                    maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {team.scope || team.rationale || '—'}
                  </td>
                  <td style={{ padding: '14px 24px', color: 'var(--color-text-primary)', fontWeight: avg ? 500 : 400 }}>
                    {avg ? `${avg} / 10` : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {statusBadge(scored, active)}
                  </td>
                  <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleSelectTeam(team)}
                      style={{
                        padding: '6px 16px',
                        fontSize: 13, fontWeight: 500,
                        border: active ? '0.5px solid #378add' : '0.5px solid var(--color-border-secondary)',
                        borderRadius: 8,
                        background: active ? '#e6f1fb' : 'transparent',
                        color: active ? '#185fa5' : 'var(--color-text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {active ? 'Scoring' : scored ? 'Re-score' : 'Start'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SCORING PANEL REMOVED - Navigates to JudgeEvaluate */}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
