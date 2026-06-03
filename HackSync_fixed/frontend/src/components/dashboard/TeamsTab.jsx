import React, { useEffect, useMemo, useState } from "react";
import { adminTeamsApi } from "../../api";

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

// ── Distribution Rules Panel ──────────────────────────────────────────────────
function RulesPanel({ rules, onChange }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-stone-900">Distribution Rules</span>
        <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
          Configure before generating
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Team Size */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Team Size
          </label>
          <select
            value={rules.teamSize}
            onChange={e => onChange({ ...rules, teamSize: Number(e.target.value) })}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-stone-500"
          >
            {[2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n} members per team</option>
            ))}
          </select>
          <p className="text-xs text-stone-400">Number of participants per team</p>
        </div>

        {/* Skill Balance */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Skill Balance
          </label>
          <select
            value={rules.skillBalance}
            onChange={e => onChange({ ...rules, skillBalance: e.target.value })}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-stone-500"
          >
            <option value="strict">Strict — 1 FE + 1 BE + 1 DS required</option>
            <option value="flexible">Flexible — any skill mix allowed</option>
            <option value="balanced">Balanced — equal skill distribution</option>
          </select>
          <p className="text-xs text-stone-400">
            {rules.skillBalance === "strict"
              ? "Each team must have exactly one Frontend, Backend, and Designer"
              : rules.skillBalance === "balanced"
              ? "Skills distributed as evenly as possible across teams"
              : "Teams formed without skill constraints"}
          </p>
        </div>

        {/* College Diversity */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
            College Diversity
          </label>
          <select
            value={rules.collegeDiversity}
            onChange={e => onChange({ ...rules, collegeDiversity: e.target.value })}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-stone-500"
          >
            <option value="strict">Strict — no two from same college</option>
            <option value="best_effort">Best effort — try to diversify</option>
            <option value="none">None — college not considered</option>
          </select>
          <p className="text-xs text-stone-400">
            {rules.collegeDiversity === "strict"
              ? "Algorithm enforces no duplicate colleges per team"
              : rules.collegeDiversity === "best_effort"
              ? "Algorithm tries to diversify with up to 80 swap attempts"
              : "Participants assigned without college constraints"}
          </p>
        </div>

        {/* Experience Grouping */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Experience Grouping
          </label>
          <select
            value={rules.experienceGrouping}
            onChange={e => onChange({ ...rules, experienceGrouping: e.target.value })}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-stone-500"
          >
            <option value="none">None — no experience constraint</option>
            <option value="mixed">Mixed — blend experience levels</option>
            <option value="similar">Similar — group same experience together</option>
          </select>
          <p className="text-xs text-stone-400">
            {rules.experienceGrouping === "mixed"
              ? "Each team gets a mix of experience levels"
              : rules.experienceGrouping === "similar"
              ? "Participants grouped by similar experience level"
              : "Experience level not used in formation"}
          </p>
        </div>

        {/* Retry Limit */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Diversity Retry Limit
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={rules.retryLimit}
              onChange={e => onChange({ ...rules, retryLimit: Number(e.target.value) })}
              className="flex-1 accent-stone-900"
            />
            <span className="text-sm font-bold text-stone-900 w-12 text-right">
              {rules.retryLimit}
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Max swap attempts before relaxing diversity constraint
          </p>
        </div>

        {/* Exclusion Tags */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Exclude Skill Tags
          </label>
          <input
            type="text"
            value={rules.excludeTags}
            onChange={e => onChange({ ...rules, excludeTags: e.target.value })}
            placeholder="e.g. intern, part-time"
            className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-500"
          />
          <p className="text-xs text-stone-400">
            Comma-separated skill tags to exclude from team formation
          </p>
        </div>
      </div>

      {/* Rules summary */}
      <div className="bg-stone-50 rounded-xl px-4 py-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-stone-500 uppercase tracking-widest mr-1">
          Active rules:
        </span>
        <span className="text-xs bg-stone-900 text-white px-2 py-1 rounded-full font-semibold">
          {rules.teamSize} per team
        </span>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
          Skill: {rules.skillBalance}
        </span>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-semibold">
          College: {rules.collegeDiversity}
        </span>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
          Experience: {rules.experienceGrouping}
        </span>
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
          {rules.retryLimit} retries
        </span>
        {rules.excludeTags && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
            Exclude: {rules.excludeTags}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main TeamsTab ─────────────────────────────────────────────────────────────
export default function TeamsTab() {
  const [teams, setTeams] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Distribution rules — all configurable
  const [rules, setRules] = useState({
    teamSize: 3,
    skillBalance: "strict",
    collegeDiversity: "best_effort",
    experienceGrouping: "none",
    retryLimit: 80,
    excludeTags: "",
  });

  const draftTeams = useMemo(() => teams.filter(t => t.status === "DRAFT"), [teams]);
  const publishedTeams = useMemo(() => teams.filter(t => t.status === "PUBLISHED"), [teams]);

  const loadTeams = async (targetStatus = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const response = await adminTeamsApi.getAll(
        targetStatus === "ALL" ? "" : targetStatus
      );
      setTeams(response.teams || []);
    } catch (e) {
      setError(e.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeams(statusFilter); }, [statusFilter]);

  useEffect(() => {
    const interval = setInterval(() => loadTeams(statusFilter), 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const generateTeams = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      // Pass all rules to backend
      const response = await adminTeamsApi.generate({
        teamSize: rules.teamSize,
        retryLimit: rules.retryLimit,
        skillBalance: rules.skillBalance,
        collegeDiversity: rules.collegeDiversity,
        experienceGrouping: rules.experienceGrouping,
        excludeTags: rules.excludeTags
          ? rules.excludeTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
          : [],
      });
      setStatusFilter("DRAFT");
      setTeams(response.teams || []);
      setMeta(response.meta || null);
      setSuccess(
        `${response.teams?.length || 0} draft team(s) generated! ` +
        `${response.meta?.relaxedDiversityConstraint ? "⚠ Diversity constraint relaxed due to limited participants." : "✓ All rules applied."}`
      );
    } catch (e) {
      setError(e.message || "Failed to generate teams");
    } finally {
      setActionLoading(false);
    }
  };

  const approveTeams = async () => {
    if (!confirmApprove) { setConfirmApprove(true); return; }
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
            Configure distribution rules, generate balanced teams, review, then approve to publish.
            <span className="ml-2 text-amber-700 font-semibold">
              ⚠ Teams require committee approval before participants are notified.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowRules(r => !r)}
            className={`h-10 px-4 rounded-xl font-semibold text-sm transition-colors border ${
              showRules
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-700 border-stone-300 hover:border-stone-500"
            }`}
          >
            ⚙ Distribution Rules
          </button>

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
            {actionLoading ? "Generating..." : "Generate Draft Teams"}
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
              {confirmApprove
                ? "⚠ Confirm Publish?"
                : `Approve & Publish (${draftTeams.length})`}
            </button>
          )}
          {confirmApprove && (
            <button
              onClick={() => setConfirmApprove(false)}
              className="h-10 px-4 rounded-xl bg-stone-200 text-sm font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* Rules Panel — collapsible */}
      {showRules && <RulesPanel rules={rules} onChange={setRules} />}

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
          <h3 className="text-2xl font-bold text-stone-900 mt-1">
            {teams.reduce((s, t) => s + (t.members?.length || 0), 0)}
          </h3>
        </article>
        <article className="bg-white p-5 rounded-2xl border border-stone-200/60">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Diversity Swaps</p>
          <h3 className="text-2xl font-bold text-stone-900 mt-1">{meta?.successfulSwaps ?? "—"}</h3>
        </article>
      </section>

      {meta?.unassignedParticipants?.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            {meta.unassignedParticipants.length} participant(s) could not be placed into a full team.
            {meta.relaxedDiversityConstraint && " College diversity constraint was relaxed."}
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
            {status}{" "}
            {status === "DRAFT"
              ? `(${draftTeams.length})`
              : status === "PUBLISHED"
              ? `(${publishedTeams.length})`
              : `(${teams.length})`}
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
              ? "Configure rules above and click 'Generate Draft Teams'."
              : "Switch filter or generate teams first."}
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map(team => (
            <article
              key={team.id}
              className="bg-white rounded-2xl border border-stone-200/60 p-5 space-y-4"
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                    {team.name}
                  </p>
                  <h3 className="text-base font-bold text-stone-900">
                    {team.members?.length || 0} members
                  </h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass(team.status)}`}>
                  {team.status}
                </span>
              </header>

              <div className="space-y-2">
                {(team.members || []).map(member => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-stone-100 px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-700 shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {member.college || "—"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${
                        SKILL_COLORS[member.skill] || "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {member.skill}
                    </span>
                  </div>
                ))}
              </div>

              {team.rationale && (
                <p className="text-xs text-stone-500 italic leading-relaxed border-t pt-3">
                  {team.rationale}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}