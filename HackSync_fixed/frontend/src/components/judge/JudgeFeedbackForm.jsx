import React, { useState } from 'react';
import { feedbackApi } from '../../api';

export default function JudgeFeedbackForm({ eventId, judgeId, judgeName }) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [criteriaClear, setCriteriaClear] = useState(null);
  const [openText, setOpenText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async () => {
    if (starRating === 0 || criteriaClear === null) {
      alert("Please complete the rating and the yes/no question.");
      return;
    }
    
    if (!eventId) {
      alert("Event ID not available. Please wait for data to load.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      await feedbackApi.submit({
        eventId,
        userId: judgeId || judgeName || "Judge",
        userType: "JUDGE",
        starRating,
        criteriaClear,
        openText
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="text-left bg-white border border-stone-200 shadow-sm rounded-2xl p-6">
      <h3 className="text-base font-bold text-stone-900 mb-4">How was your judging experience?</h3>
      
      {feedbackSubmitted ? (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-100">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <span className="font-semibold text-sm">Thank you! Your feedback has been submitted.</span>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">Overall Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setStarRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <span 
                    className={`material-symbols-outlined text-[28px] ${star <= starRating ? 'text-amber-400' : 'text-stone-200'}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Were the evaluation criteria clear?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCriteriaClear(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border ${criteriaClear === true ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'}`}
              >
                Yes
              </button>
              <button
                onClick={() => setCriteriaClear(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border ${criteriaClear === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'}`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">Any suggestions for improving the judging process?</p>
            <textarea
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full bg-white border border-stone-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none min-h-[80px]"
            />
          </div>

          <button
            onClick={handleSubmitFeedback}
            disabled={submittingFeedback}
            className="w-full bg-stone-900 text-white font-bold py-2.5 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
