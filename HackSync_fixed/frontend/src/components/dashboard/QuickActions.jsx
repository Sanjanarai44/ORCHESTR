import React, { useState, useEffect } from "react";
import { aiApi, adminTeamsApi } from "../../api";

function QuickActions({ eventId }) {
  const [emails, setEmails] = useState({});
  const [loadingType, setLoadingType] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const check = () => {
      // FIXED: use adminTeamsApi.getAll with eventId instead of removed getPendingCount
      adminTeamsApi.getAll(eventId, "DRAFT")
        .then(r => setPendingCount((r.teams || []).length))
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [eventId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      // FIXED: pass eventId
      const data = await adminTeamsApi.approveAndPublish(eventId);
      alert(`✅ ${data.publishedCount || "All"} teams approved and published!`);
      setPendingCount(0);
    } catch { alert("❌ Approval failed."); }
    setApproving(false);
  };

  const generateEmail = async (type) => {
    setLoadingType(type);
    try {
      let res;
      if (type === 'participant') {
        res = await aiApi.draftEmail({
          stage: "Team Assignment",
          team_name: "Your Team",
          participant_name: "Participant",
          event_id: eventId,
        });
      } else if (type === 'judge') {
        res = await aiApi.draftEmail({
          stage: "Judge Invitation",
          team_name: "N/A",
          participant_name: "Judge Smith",
          event_id: eventId,
        });
      } else if (type === 'qualified') {
        res = await aiApi.draftResultsEmail({
          participant_name: "Participant",
          team_name: "Your Team",
          rank: 1,
          score: 9.5
        });
      }
      
      let emailContent = res.email;
      if (type === 'qualified') {
         emailContent = emailContent.replace(/<[^>]+>/g, '').trim(); 
      }
      
      setEmails(prev => ({ ...prev, [type]: emailContent }));
    } catch (err) { console.error(err); }
    setLoadingType(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">

      {/* Approval card */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between transition-all ${
        pendingCount > 0 ? "border-amber-300 bg-amber-50" : "border-[#1B4332]/10"
      }`}>
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            pendingCount > 0 ? "bg-amber-100" : "bg-[#1B4332]/5"
          }`}>
            <span className={`material-symbols-outlined text-[22px] ${
              pendingCount > 0 ? "text-amber-600" : "text-[#1B4332]/40"
            }`}>
              {pendingCount > 0 ? "pending_actions" : "check_circle"}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">
              {pendingCount > 0 ? "Teams Awaiting Approval" : "All Teams Approved"}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} draft team${pendingCount !== 1 ? "s" : ""} — not yet published`
                : "No pending approvals. Participants can view their teams."}
            </p>
          </div>
        </div>

        {pendingCount > 0 ? (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition-all"
          >
            {approving
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span className="material-symbols-outlined text-[16px]">check_circle</span>}
            {approving ? "Publishing..." : `Approve & Publish ${pendingCount} Teams`}
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-[#1B4332]/5 text-[#1B4332] text-xs font-bold py-3 rounded-xl">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            No Pending Actions
          </div>
        )}
      </div>

      {/* AI email card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#1B4332]/10 p-6">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-xs font-bold text-[#1B4332] uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">psychology</span>
            AI Email Drafting
          </h4>
        </div>

        <div className="space-y-3">
          {[
            { id: "participant", title: "Participant Portal", sub: "Welcome & Login Link" },
            { id: "judge", title: "Judge Portal", sub: "Magic Link Access" },
            { id: "qualified", title: "Qualification Results", sub: "Top teams announcement" },
          ].map((item) => (
            <div key={item.id} className="bg-[#F5F3F0] rounded-lg p-3 flex flex-col border border-gray-200 transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">{item.title}</p>
                  <p className="text-[9px] text-gray-500 uppercase">{item.sub}</p>
                </div>
                <button
                  onClick={() => generateEmail(item.id)}
                  disabled={loadingType === item.id}
                  className="text-[10px] font-bold text-[#1B4332] hover:underline disabled:opacity-50"
                >
                  {loadingType === item.id ? "GENERATING..." : "PREVIEW"}
                </button>
              </div>
              
              {emails[item.id] && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-[10px] uppercase text-gray-500 mb-2 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                    AI Draft
                  </p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{emails[item.id]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickActions;