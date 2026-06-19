// components/participant/ParticipantLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { teamsApi, scoresApi, feedbackApi } from "../../api";

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

export default function ParticipantLeaderboard({ eventId = 1, currentTeamId, participantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allScored, setAllScored] = useState(false);
  
  // Feedback state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [timelineClear, setTimelineClear] = useState(null);
  const [aiMentorUseful, setAiMentorUseful] = useState(null);
  const [participateAgain, setParticipateAgain] = useState(null);
  const [openText, setOpenText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const statusRes = await fetch(`${NODE}/api/participants/event-status/${eventId}`);
        const statusData = await statusRes.json();
        setAllScored(statusData.resultsPublished);

        const res = await teamsApi.getAll(eventId);
        const teams = res?.teams || [];

        const withScores = await Promise.all(
          teams.map(async (team) => {
            try {
              const s = await scoresApi.getByTeam(team.id);
              return {
                id: team.id,
                name: team.name,
                average: s.average ? Number(s.average).toFixed(1) : null,
              };
            } catch {
              return { id: team.id, name: team.name, average: null };
            }
          })
        );

        withScores.sort((a, b) => {
          const av = parseFloat(a.average) || -1;
          const bv = parseFloat(b.average) || -1;
          return bv - av;
        });

        withScores.forEach((r, i) => { r.rank = i + 1; });
        setRows(withScores);
      } catch {}
      setLoading(false);
    };
    load();
  }, [eventId]);

  const handleSubmitFeedback = async () => {
    if (starRating === 0 || timelineClear === null || aiMentorUseful === null || participateAgain === null) {
      alert("Please complete the rating and all yes/no questions.");
      return;
    }
    
    setSubmittingFeedback(true);
    try {
      await feedbackApi.submit({
        eventId,
        userId: participantId || "unknown-participant",
        userType: "PARTICIPANT",
        starRating,
        timelineClear,
        aiMentorUseful,
        participateAgain,
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
    <div className="bg-white rounded-2xl border border-[#c1c8c2]/30 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#012d1d] mb-4">Leaderboard</h2>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading standings…</div>
      ) : !allScored ? (
        <div className="py-8 text-center text-gray-400 text-sm">
          Standings will appear here once results are published.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((team) => {
            const isMine = team.id === currentTeamId;
            return (
              <div
                key={team.id}
                className={`flex items-center px-4 py-3 rounded-xl ${
                  isMine ? "bg-[#c1ecd4] ring-2 ring-[#012d1d]" : "bg-[#f5f9f7]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    team.rank === 1 ? "bg-[#f4c542] text-[#012d1d]" : "bg-[#012d1d] text-white"
                  }`}>
                    {team.rank}
                  </span>
                  <span className="text-sm font-semibold text-[#031f22]">
                    {team.name}
                    {isMine && <span className="ml-2 text-xs text-[#012d1d]/70">(Your Team)</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Participant Feedback Form - Always visible as requested */}
      <div className="mt-8 pt-6 border-t border-[#c1c8c2]/30">
        <h3 className="text-md font-bold text-[#012d1d] mb-4">How was your experience?</h3>
        
        {feedbackSubmitted ? (
          <div className="bg-[#eafdff] text-[#012d1d] p-4 rounded-xl flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#012d1d]">check_circle</span>
            <span className="font-semibold text-sm">Thank you! Your feedback has been submitted.</span>
          </div>
        ) : (
          <div className="space-y-5 bg-[#f5f9f7] p-5 rounded-xl border border-[#c1c8c2]/30">
            {/* Star Rating */}
            <div>
              <p className="text-sm font-semibold text-[#031f22] mb-2">Overall Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStarRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <span 
                      className={`material-symbols-outlined text-[28px] ${star <= starRating ? 'text-[#f4c542]' : 'text-gray-300'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Yes/No Questions */}
            <div className="space-y-3">
              {[
                { label: "Was the event timeline clear?", state: timelineClear, setter: setTimelineClear },
                { label: "Did you find the AI mentor useful?", state: aiMentorUseful, setter: setAiMentorUseful },
                { label: "Would you participate again?", state: participateAgain, setter: setParticipateAgain }
              ].map((q, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-[#414844]">{q.label}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => q.setter(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border ${q.state === true ? 'bg-[#012d1d] text-white border-[#012d1d]' : 'bg-white text-[#414844] border-gray-300 hover:bg-gray-50'}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => q.setter(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border ${q.state === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-[#414844] border-gray-300 hover:bg-gray-50'}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Open Text */}
            <div>
              <p className="text-sm font-semibold text-[#031f22] mb-2">What was the hardest part of participating online?</p>
              <textarea
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#012d1d] focus:border-[#012d1d] outline-none min-h-[80px]"
              />
            </div>

            <button
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback}
              className="w-full bg-[#012d1d] text-white font-bold py-2.5 rounded-xl hover:bg-[#024029] transition-colors disabled:opacity-50"
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}