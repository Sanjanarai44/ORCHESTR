import React, { useState, useEffect } from "react";
import { aiApi, teamsApi } from "../../api";

function QuickActions({ eventId = 1 }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const check = () => {
      teamsApi.getPendingCount(eventId)
        .then(d => setPendingCount(d.pending || 0))
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [eventId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const data = await teamsApi.approve(eventId);
      alert(`✅ ${data.approved} teams approved and published!`);
      setPendingCount(0);
    } catch { alert("❌ Approval failed."); }
    setApproving(false);
  };

  const generateEmail = async () => {
    setLoading(true);
    try {
      const res = await aiApi.draftEmail({ stage: "Team Assignment", team_name: "Your Team", participant_name: "Participant", event_id: eventId });
      setEmail(res.email);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">

      {/* Approval card */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between transition-all ${pendingCount > 0 ? "border-amber-300 bg-amber-50" : "border-[#1B4332]/10"}`}>
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${pendingCount > 0 ? "bg-amber-100" : "bg-[#1B4332]/5"}`}>
            <span className={`material-symbols-outlined text-[22px] ${pendingCount > 0 ? "text-amber-600" : "text-[#1B4332]/40"}`}>
              {pendingCount > 0 ? "pending_actions" : "check_circle"}
            </span>
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">{pendingCount > 0 ? "Teams Awaiting Approval" : "All Teams Approved"}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} draft team${pendingCount !== 1 ? "s" : ""} — not yet published`
                : "No pending approvals. Participants can view their teams."}
            </p>
          </div>
        </div>

        {pendingCount > 0 ? (
          <button onClick={handleApprove} disabled={approving}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition-all">
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
          <button onClick={generateEmail} disabled={loading}
            className="text-[10px] font-bold text-[#1B4332] hover:underline disabled:opacity-50">
            {loading ? "GENERATING..." : "DRAFT EMAIL"}
          </button>
        </div>

        <div className="space-y-3">
          {[
            { title: "Team Assignment", sub: "Welcome email", badge: "Ready", badgeClass: "text-[#1B4332] bg-[#1B4332]/10" },
            { title: "Evaluation Reminder", sub: "Judge notification", badge: "Pending", badgeClass: "text-gray-400 bg-gray-100" },
          ].map((item, i) => (
            <div key={i} className="bg-[#F5F3F0] rounded-lg p-3 flex justify-between items-center border border-gray-200">
              <div>
                <p className="text-xs font-bold">{item.title}</p>
                <p className="text-[9px] text-gray-500 uppercase">{item.sub}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeClass}`}>{item.badge}</span>
            </div>
          ))}

          {email && (
            <div className="bg-[#F5F3F0] rounded-lg p-4 border border-gray-200 mt-2">
              <p className="text-[10px] uppercase text-gray-500 mb-2 font-bold">AI Draft</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickActions;
