import React, { useEffect, useMemo, useState } from "react";
import { adminTeamsApi, judgesApi } from "../../api";

function getInitials(name) {
  return String(name || "").split(" ").filter(Boolean).map(t => t[0]).join("").toUpperCase().slice(0, 2);
}

function statusClass(status) {
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  return "bg-amber-100 text-amber-800";
}

const SKILL_COLORS = {
  Frontend: "bg-blue-100 text-blue-800",
  Backend: "bg-purple-100 text-purple-800",
  Designer: "bg-pink-100 text-pink-800",
};

export default function TeamsTab() {
  const [teams, setTeams] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [teamSize, setTeamSize] = useState(3);

  const draftTeams = useMemo(() => teams.filter(t => t.status === "DRAFT"), [teams]);
  const publishedTeams = useMemo(() => teams.filter(t => t.status === "PUBLISHED"), [teams]);

  const loadTeams = async (targetStatus = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const response = await adminTeamsApi.getAll(targetStatus === "ALL" ? "" : targetStatus);
      setTeams(response.teams || []);
    } catch (e) {
      setError(e.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeams(statusFilter); }, [statusFilter]);

  // Real-time polling every 15s
  useEffect(() => {
    const interval = setInterval(() => loadTeams(statusFilter), 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const generateTeams = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await adminTeamsApi.generate({ retryLimit: 80, teamSize });
      setStatusFilter("DRAFT");
      setTeams(response.teams || []);
      setMeta(response.meta || null);
      setSuccess(`${response.teams?.length || 0} draft team(s) generated! Review below, then approve to publish.`);
    } catch (e) {
      setError(e.message || "Failed to generate teams");
    } finally {
      setActionLoading(false);
    }
  };

  // APPROVAL GATE: require explicit confirmation
  const approveTeams = async () => {
    if (!confirmApprove) {
      setConfirmApprove(true);
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    setConfirmApprove(false);
    try {
      const res = await adminTeamsApi.approveAndPublish();
      setStatusFilter("ALL");
      setMeta(null);
      setSuccess(`${res.publishedCount || "All"} team(s) published! Participants can now be notified.`);
      await loadTeams("ALL");
    } catch (e) {
      setError(e.message || "Failed to publish teams");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTeams = useMemo(() => {
    if (statusFilter === "ALL") return teams;
    return teams.filter(t => t.status === statusFilter);
  }, [teams, statusFilter]);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto text-stone-800">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">Team Builder</h2>
          <p className="text-sm text-stone-500">
            Generate balanced teams, review compositions, then approve to publish.
            <span className="ml-2 text-amber-700 font-semibold">⚠ Teams require committee approval before participants are notified.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="font-semibold text-stone-600">Team size:</label>
            <select
              value={teamSize}
              onChange={e => setTeamSize(Number(e.target.value))}
              className="border border-stone-300 rounded-lg px-2 py-1 text-sm"
            >
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <button
            onClick={() => loadTeams(statusFilter)}
            disabled={actionLoading}
            className="h-10 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            ↻ Refresh
          </button>

          <button
            onClick={generateTeams}
            disabled={actionLoading}
            className="h-10 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60"
          >
            {actionLoading ? "Working..." : "Generate Draft Teams"}
          </button>

          {draftTeams.length > 0 && (
            <button
              onClick={approveTeams}
              disabled={actionLoading}
              className={`h-10 px-6 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50 ${
                confirmApprove
                  ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {confirmApprove ? "⚠ Confirm Publish?" : `Approve & Publish (${draftTeams.length})`}
            </button>
          )}
          {confirmApprove && (
            <button onClick={() => setConfirmApprove(false)} className="h-10 px-4 rounded-xl bg-stone-200 text-sm font-semibold">
              Cancel
            </button>
          )}
          <button
            onClick={async () => {
              setActionLoading(true);
              setError("");
              setSuccess("");
              try {
                const res = await judgesApi.sendParticipantEmails("welcome");
                setSuccess(res.message || `Emails queued for ${res.sentCount} participants`);
              } catch (e) {
                setError(e.message || "Failed to send emails");
              } finally {
                setActionLoading(false);
              }
            }}
            disabled={actionLoading || publishedTeams.length === 0}
            className="flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shadow-sm"
          >
            {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
            {actionLoading ? 'Sending...' : 'Send Participant Links'}
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm font-semibold">
          ✗ {error}
        </section>
      )}
      {success && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm font-semibold">
          ✓ {success}
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <article className="bg-white p-5 rounded-2xl border border-stone-200/60">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Draft</p>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{draftTeams.length}</h3>
        </article>
        <article className="bg-white p-5 rounded-2xl border border-stone-200/60">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Published</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{publishedTeams.length}</h3>
        </article>
        <article className="bg-white p-5 rounded-2xl border border-stone-200/60">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Total Participants</p>
          <h3 className="text-2xl font-bold text-stone-900 mt-1">{teams.reduce((s, t) => s + (t.members?.length || 0), 0)}</h3>
        </article>
        <article className="bg-white p-5 rounded-2xl border border-stone-200/60">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Diversity Swaps</p>
          <h3 className="text-2xl font-bold text-stone-900 mt-1">{meta?.successfulSwaps ?? "—"}</h3>
        </article>
      </section>

      {meta?.unassignedParticipants?.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            {meta.unassignedParticipants.length} participant(s) could not be placed into a full team and were left unassigned.
          </p>
        </section>
      )}

      {/* Filter tabs */}
      <section className="flex flex-wrap gap-2">
        {["ALL", "DRAFT", "PUBLISHED"].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`h-9 px-4 rounded-lg text-xs font-bold tracking-wide transition-colors ${
              statusFilter === status
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {status} {status === "DRAFT" ? `(${draftTeams.length})` : status === "PUBLISHED" ? `(${publishedTeams.length})` : `(${teams.length})`}
          </button>
        ))}
      </section>

      {/* Team cards */}
      {loading ? (
        <div className="p-8 text-stone-500 text-sm">Loading teams...</div>
      ) : filteredTeams.length === 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
          <h3 className="text-base font-bold text-stone-900">
            {statusFilter === "DRAFT" ? "No draft teams yet" : "No teams found"}
          </h3>
          <p className="text-sm text-stone-500 mt-1">
            {statusFilter === "DRAFT"
              ? "Click 'Generate Draft Teams' above to create teams from your participant roster."
              : "Switch filter or generate teams first."}
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map(team => (
            <article key={team.id} className="bg-white rounded-2xl border border-stone-200/60 p-5 space-y-4">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">{team.name}</p>
                  <h3 className="text-base font-bold text-stone-900">{team.members?.length || 0} members</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass(team.status)}`}>
                  {team.status}
                </span>
              </header>

              <div className="space-y-2">
                {(team.members || []).map(member => (
                  <div key={member.id} className="rounded-xl border border-stone-100 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-700 shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{member.name}</p>
                        <p className="text-xs text-stone-500 truncate">{member.college || "—"}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${SKILL_COLORS[member.skill] || "bg-stone-100 text-stone-700"}`}>
                      {member.skill}
                    </span>
                  </div>
                ))}
              </div>

              {team.rationale && (
                <p className="text-xs text-stone-500 italic leading-relaxed border-t pt-3">{team.rationale}</p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
