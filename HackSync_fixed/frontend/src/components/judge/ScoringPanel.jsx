import React, { useState } from 'react';
import StarRating from './StarRating';

import { judgeApi } from '../../api';
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
      await judgeApi.submitEvaluation({
        teamId: team.id,
        scoreCode: scores.scoreCode,
        scoreInnovation: scores.scoreInnovation,
        scorePresentation: scores.scorePresentation,
        comment: comment.trim(),
        starRating,
      }, judgeToken);

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
    <div className="bg-white rounded-[2rem] shadow-2xl border border-[#E2DDD8] p-8 space-y-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#012d1d] via-[#a5d0b9] to-[#012d1d]" />
      
      <div className="space-y-7">
        {CRITERIA.map((criterion) => {
          const value = scores[criterion.key];
          const isTouched = touched[criterion.key];

          return (
            <div key={criterion.key} className="space-y-4 group">
              <div>
                <p className="text-sm font-extrabold text-[#012d1d] tracking-wide flex items-center gap-2">
                  {criterion.label}
                  {isTouched && <span className="material-symbols-outlined text-[#a5d0b9] text-[16px]">check_circle</span>}
                </p>
                <p className="text-[13px] text-[#6b7280] mt-1.5 leading-relaxed font-medium">{criterion.description}</p>
              </div>
              <div className="flex items-center gap-6">
                <input
                  id={`slider-${criterion.key}`}
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={isTouched ? value : 1}
                  onChange={(e) => handleSliderChange(criterion.key, e.target.value)}
                  className="flex-1 h-3 appearance-none bg-[#F0EDE9] rounded-full cursor-pointer accent-[#012d1d] hover:bg-[#E2DDD8] transition-colors shadow-inner"
                />
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black transition-all shadow-sm flex-shrink-0 ${
                    isTouched
                      ? 'bg-gradient-to-br from-[#012d1d] to-[#024a31] text-[#a5d0b9] ring-4 ring-[#012d1d]/10 transform scale-105'
                      : 'border-2 border-[#E2DDD8] bg-[#FAFAF9] text-[#b0bec5]'
                  }`}
                >
                  {isTouched ? value : '—'}
                </div>
              </div>
              <div className="flex justify-between px-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span
                    key={n}
                    className={`text-[11px] font-extrabold ${
                      isTouched && n <= value ? 'text-[#012d1d]' : 'text-[#b0bec5]'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full h-px bg-[#E2DDD8]" />

      <div className="space-y-4">
        <p className="text-sm font-extrabold text-[#012d1d] tracking-wide">Overall Impression (Optional)</p>
        <StarRating value={starRating} onChange={setStarRating} />
      </div>

      <div className="space-y-3">
        <label htmlFor="eval-comment" className="text-sm font-extrabold text-[#012d1d] tracking-wide flex justify-between items-end">
          <span>Evaluation Notes</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${commentValid ? 'text-[#a5d0b9]' : 'text-[#b0bec5]'}`}>
            {comment.trim().length} / 20 min
          </span>
        </label>
        <textarea
          id="eval-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => setCommentTouched(true)}
          rows={4}
          placeholder="Share your detailed evaluation notes here… What stood out? What could be improved?"
          className={`w-full resize-none rounded-2xl border-2 p-5 text-sm text-[#031f22] font-medium placeholder-[#b0bec5] focus:outline-none focus:ring-0 transition-all ${
            (submitAttempted || commentTouched) && !commentValid
              ? 'border-red-300 bg-red-50/50'
              : 'border-[#E2DDD8] bg-[#FAFAF9] focus:border-[#012d1d] focus:bg-white'
          }`}
        />
      </div>

      <div className="space-y-3 pt-2">
        <button
          id="submit-scores-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full py-4 rounded-2xl text-[15px] font-extrabold tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg ${
            canSubmit
              ? 'bg-[#012d1d] text-white hover:bg-[#024a31] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md'
              : 'bg-[#F0EDE9] text-[#9aa5ae] cursor-not-allowed shadow-none'
          }`}
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-[#a5d0b9]/30 border-t-[#a5d0b9] rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px] text-[#a5d0b9]">publish</span>
              Submit Evaluation for {team?.name || 'this team'}
            </>
          )}
        </button>
        <div className="text-center pt-2">
          <p className="text-[10px] font-extrabold text-[#9aa5ae] uppercase tracking-widest">Scores can be updated before deadline</p>
        </div>
        {submitAttempted && !canSubmit && (
          <div className="bg-red-50 text-red-600 text-[13px] font-bold p-3.5 rounded-xl flex items-center gap-2 justify-center mt-4 border border-red-100 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {!allSlidersMoved
              ? 'Please move all three scoring sliders.'
              : 'Please add at least 20 characters to your notes.'}
          </div>
        )}
      </div>
    </div>
  );
}
