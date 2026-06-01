import React, { useState } from 'react';
import StarRating from './StarRating';

// FIXED: Use Node backend (5000) not 8001
const API = 'import.meta.env.VITE_NODE_URL || 'http://localhost:5000';

const CRITERIA = [
  {
    key: 'scoreCode',
    label: 'Code Quality',
    description: 'Readability, architecture, use of best practices, and technical soundness.',
  },
  {
    key: 'scoreInnovation',
    label: 'Innovation',
    description: 'Originality of the idea, creative approach to the problem, and novelty.',
  },
  {
    key: 'scorePresentation',
    label: 'Presentation',
    description: 'Clarity of demo, communication of impact, and overall delivery.',
  },
];

export default function ScoringPanel({ team, judgeToken, onSubmitted }) {
  const [scores, setScores] = useState({ scoreCode: 0, scoreInnovation: 0, scorePresentation: 0 });
  const [touched, setTouched] = useState({ scoreCode: false, scoreInnovation: false, scorePresentation: false });
  const [starRating, setStarRating] = useState(0);
  const [comment, setComment] = useState('');
  const [commentTouched, setCommentTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const allSlidersMoved = CRITERIA.every((c) => touched[c.key] && scores[c.key] > 0);
  const commentValid = comment.trim().length >= 20;
  const canSubmit = allSlidersMoved && commentValid;

  const handleSliderChange = (key, value) => {
    setScores((prev) => ({ ...prev, [key]: Number(value) }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      // FIXED: submit to /api/judge/evaluate with Authorization header
      const res = await fetch(`${API}/api/judge/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${judgeToken}`,
        },
        body: JSON.stringify({
          teamId: team.id,
          scoreCode: scores.scoreCode,
          scoreInnovation: scores.scoreInnovation,
          scorePresentation: scores.scorePresentation,
          comment: comment.trim(),
          starRating,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Submission failed');

      if (onSubmitted) {
        onSubmitted(team.id, null);
      }
    } catch (err) {
      alert(`Error submitting scores: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {CRITERIA.map((criterion) => {
        const value = scores[criterion.key];
        const isTouched = touched[criterion.key];

        return (
          <div key={criterion.key} className="space-y-3">
            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-white">{criterion.label}</p>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{criterion.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                id={`slider-${criterion.key}`}
                type="range"
                min={1}
                max={10}
                step={1}
                value={isTouched ? value : 1}
                onChange={(e) => handleSliderChange(criterion.key, e.target.value)}
                className="flex-1 h-2 appearance-none bg-stone-200 rounded-full cursor-pointer accent-stone-900"
              />
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${
                  isTouched
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-300'
                }`}
              >
                {isTouched ? value : '—'}
              </div>
            </div>
            <div className="flex justify-between px-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <span
                  key={n}
                  className={`text-[9px] font-semibold ${
                    isTouched && n <= value ? 'text-stone-700' : 'text-stone-300'
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-stone-600">Overall impression (optional)</p>
        <StarRating value={starRating} onChange={setStarRating} />
      </div>

      <div className="space-y-2">
        <label htmlFor="eval-comment" className="text-sm font-bold text-stone-900">
          Evaluation notes <span className="text-stone-400 font-normal">(required, minimum 20 characters)</span>
        </label>
        <textarea
          id="eval-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => setCommentTouched(true)}
          rows={4}
          placeholder="Share your detailed evaluation notes here…"
          className={`w-full resize-none rounded-xl border p-3 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all ${
            (submitAttempted || commentTouched) && !commentValid
              ? 'border-red-400 focus:ring-red-400'
              : 'border-stone-200'
          }`}
        />
        <p className={`text-xs font-semibold transition-colors ${commentValid ? 'text-emerald-600' : 'text-stone-400'}`}>
          {comment.trim().length} / 20 minimum{commentValid ? ' ✓' : ''}
        </p>
      </div>

      <div className="space-y-2">
        <button
          id="submit-scores-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            canSubmit
              ? 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            `Submit scores for ${team?.name || 'this team'}`
          )}
        </button>
        <p className="text-xs text-stone-400 text-center">Scores can be updated before deadline</p>
        {submitAttempted && !canSubmit && (
          <p className="text-xs text-red-500 text-center font-medium">
            {!allSlidersMoved
              ? 'Please move all three scoring sliders before submitting.'
              : 'Please add at least 20 characters to your evaluation notes.'}
          </p>
        )}
      </div>
    </div>
  );
}
