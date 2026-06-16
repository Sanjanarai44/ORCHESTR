import React, { useState, useEffect } from "react";
import AdminLayout from "../layouts/AdminLayout";
import WorkflowTracker from "../components/shared/WorkflowTracker";
import StatsGrid from "../components/dashboard/StatsGrid";
import QuickActions from "../components/dashboard/QuickActions";
import LeaderboardTable from "../components/dashboard/LeaderboardTable";
import AlertCard from "../components/dashboard/AlertCard";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import ParticipantsTab from "../components/dashboard/ParticipantsTab.jsx";
import TeamsTab from "../components/dashboard/TeamsTab.jsx";
import JudgesTab from "../components/dashboard/JudgesTab.jsx";
import EvaluationsTab from "../components/dashboard/EvaluationsTab.jsx";
import EmailsTab from "../components/dashboard/EmailsTab.jsx";

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';

// FIXED: ApprovalBanner passes eventId in query and body
function ApprovalBanner({ eventId, onApprove, onDismiss }) {
  const [approving, setApproving] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    fetch(`${NODE}/api/admin/teams?eventId=${eventId}&status=DRAFT`)
      .then(r => r.json())
      .then(d => setCount((d.teams || []).length))
      .catch(() => {});
  }, [eventId]);

  if (count === 0) return null;

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`${NODE}/api/admin/approve-publish-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      alert(`✅ ${data.publishedCount || "All"} teams approved and published!`);
      setCount(0);
      onApprove?.();
    } catch { alert("❌ Approval failed."); }
    setApproving(false);
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-amber-600 text-[18px]">pending_actions</span>
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900">
            {count} team{count !== 1 ? "s" : ""} pending your approval
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Generated but not published. Participants won't see assignments until you approve.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onDismiss}
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors"
        >
          Review First
        </button>
        <button
          onClick={handleApprove}
          disabled={approving}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
        >
          {approving
            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <span className="material-symbols-outlined text-[16px]">check_circle</span>}
          {approving ? "Approving..." : `Approve & Publish All`}
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard({ eventConfig, eventId, organizer, onBack, onLogout }) {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showBanner, setShowBanner] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleApproved = () => {
    setShowBanner(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      eventConfig={eventConfig}
      organizer={organizer}
      onBack={onBack}
      onLogout={onLogout}
    >
      {activeTab === "Dashboard" && (
        <div className="space-y-6">
          {showBanner && eventId && (
            <ApprovalBanner
              eventId={eventId}
              onApprove={handleApproved}
              onDismiss={() => setActiveTab("Teams")}
            />
          )}
          <WorkflowTracker eventId={eventId} isAdmin={true} />
          <StatsGrid key={refreshKey} eventConfig={eventConfig} eventId={eventId} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
            <div className="lg:col-span-8 space-y-6">
              <QuickActions eventId={eventId} />
              <LeaderboardTable key={refreshKey} eventConfig={eventConfig} eventId={eventId} />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <AlertCard eventId={eventId} />
              <ActivityFeed eventId={eventId} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "Participants" && (
        <ParticipantsTab eventConfig={eventConfig} eventId={eventId} />
      )}
      {activeTab === "Teams" && (
        <TeamsTab
          eventConfig={eventConfig}
          eventId={eventId}
          onTeamsGenerated={() => setShowBanner(true)}
        />
      )}
      {activeTab === "Judges" && (
        <JudgesTab eventConfig={eventConfig} eventId={eventId} />
      )}
      {activeTab === "Evaluations" && (
        <EvaluationsTab eventConfig={eventConfig} eventId={eventId} />
      )}
      {activeTab === "Emails" && (
        <EmailsTab eventConfig={eventConfig} eventId={eventId} />
      )}
    </AdminLayout>
  );
}