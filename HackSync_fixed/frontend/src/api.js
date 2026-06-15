/**
 * API routing:
 * Port 5000 (Node/PostgreSQL) → ALL data: participants, teams, judges, evaluations
 * Port 8000 (Python/AI) → ONLY AI calls: rationale, email drafting, event config
 */

const NODE = import.meta.env.VITE_NODE_URL || 'https://orchestr-backend-8u5k.onrender.com';
const AI   = import.meta.env.VITE_AI_URL   || 'https://orchestr-ai.onrender.com';

async function nodeRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  const res = await fetch(`${NODE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || `API error ${res.status}`);
  }
  return res.json();
}

async function aiRequest(path, options = {}) {
  const res = await fetch(`${AI}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || `AI error ${res.status}`);
  }
  return res.json();
}

// ─── Auth (Python) ────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => aiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => aiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Events — stored in PostgreSQL via Node ───────────────────────────────────
export const eventsApi = {
  getAll: (organizerId) => aiRequest(`/events?organizer_id=${organizerId}`),
  create: (data) => aiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => aiRequest(`/events/${id}`, { method: 'DELETE' }),
};

// ─── Participants (Node → PostgreSQL) ─────────────────────────────────────────
export const participantsApi = {
  getAll: (eventId) => nodeRequest(`/api/admin/participants?eventId=${eventId}`),
  getById: (id) => nodeRequest(`/api/admin/participants/${id}`),
  getByEmail: (email, eventId) => nodeRequest(
    `/api/admin/participants/by-email/${encodeURIComponent(email)}${eventId ? `?eventId=${eventId}` : ''}`
  ),
  add: (data) => nodeRequest('/api/admin/participants', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => nodeRequest(`/api/admin/participants/${id}`, { method: 'DELETE' }),
};

// ─── Teams (Node → PostgreSQL) ────────────────────────────────────────────────
export const adminTeamsApi = {
  getAll: (eventId, status = '') => nodeRequest(
    `/api/admin/teams?eventId=${eventId}${status ? `&status=${encodeURIComponent(status)}` : ''}`
  ),
  getDraft: (eventId) => nodeRequest(`/api/admin/teams?eventId=${eventId}&status=DRAFT`),
  getPublished: (eventId) => nodeRequest(`/api/admin/teams?eventId=${eventId}&status=PUBLISHED`),
  generate: (eventId, opts = {}) => nodeRequest('/api/admin/generate-teams', {
    method: 'POST', body: JSON.stringify({ eventId, ...opts }),
  }),
  approveAndPublish: (eventId) => nodeRequest('/api/admin/approve-publish-teams', {
    method: 'POST', body: JSON.stringify({ eventId }),
  }),
  approveTeam: (teamId) =>
  nodeRequest(`/api/admin/teams/${teamId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "PUBLISHED"
    }),
  }),

deleteTeam: (teamId) =>
  nodeRequest(`/api/admin/teams/${teamId}`, {
    method: "DELETE",
  }),
};

// ─── Teams alias (participant dashboard) ──────────────────────────────────────
export const teamsApi = {
  getAll: (eventId) => nodeRequest(`/api/admin/teams?eventId=${eventId}`),
  getPublished: (eventId) => nodeRequest(`/api/admin/teams?eventId=${eventId}&status=PUBLISHED`),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: (eventId) => nodeRequest(`/api/admin/leaderboard?eventId=${eventId}`),
};

// ─── Approvals ────────────────────────────────────────────────────────────────
export const approvalsApi = {
  getPending: (eventId) => nodeRequest(`/api/admin/pending-approvals?eventId=${eventId}`),
};

// ─── Scores (Node → PostgreSQL) ───────────────────────────────────────────────
export const scoresApi = {
  submit: (data, token) => nodeRequest('/api/judge/evaluate', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  }),
  getByTeam: (teamId) => nodeRequest(`/api/admin/scores/${teamId}`),
};

// ─── Judges (Node → PostgreSQL) ───────────────────────────────────────────────
export const judgesApi = {
  getAll: (eventId) => nodeRequest(`/api/admin/judges?eventId=${eventId}`),
  add: (data) => nodeRequest('/api/admin/judges', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => nodeRequest(`/api/admin/judges/${id}`, { method: 'DELETE' }),
  sendLinks: (eventId) => nodeRequest('/api/admin/send-judge-links', {
    method: 'POST', body: JSON.stringify({ eventId }),
  }),
  assignTeams: (eventId) => nodeRequest('/api/admin/assign-judges', {
    method: 'POST', body: JSON.stringify({ eventId }),
  }),
  sendParticipantEmails: (eventId, emailType) => nodeRequest('/api/admin/send-participant-emails', {
    method: 'POST', body: JSON.stringify({ eventId, emailType }),
  }),
  uploadCSV: (formData) => nodeRequest('/api/admin/upload-judges', {
    method: 'POST', body: formData,
  }),
};

// ─── Judge Portal (Node → PostgreSQL) ─────────────────────────────────────────
export const judgeApi = {
  verify: (token) => nodeRequest(`/api/judge/verify?token=${encodeURIComponent(token)}`),
  getTeams: (token) => nodeRequest(`/api/judge/teams`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
  submitEvaluation: (data, token) => nodeRequest('/api/judge/evaluate', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(data),
  }),
  getProgress: (token) => nodeRequest(`/api/judge/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
};

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activityApi = {
  getLog: (eventId) => nodeRequest(`/api/admin/activity-log${eventId ? `?eventId=${eventId}` : ''}`),
};

// ─── Stage Management ─────────────────────────────────────────────────────────
export const stageApi = {
  getStages: (eventId) => nodeRequest(`/api/admin/stages${eventId ? `?eventId=${eventId}` : ''}`),
  advanceStage: (fromStage, toStage, eventId) => nodeRequest('/api/admin/advance-stage', {
    method: 'POST', body: JSON.stringify({ from_stage: fromStage, to_stage: toStage, eventId }),
  }),
};

// ─── AI (Python → LLM) ────────────────────────────────────────────────────────
export const aiApi = {
  generateRationale: (data) => aiRequest('/generate-rationale', { method: 'POST', body: JSON.stringify(data) }),
  draftEmail: (data) => aiRequest('/draft-email', { method: 'POST', body: JSON.stringify(data) }),
  generateRubric: (data) => aiRequest('/generate-rubric', { method: 'POST', body: JSON.stringify(data) }),
  explainAnomaly: (data) => aiRequest('/explain-anomaly', { method: 'POST', body: JSON.stringify(data) }),
  compatibilitySummary: (data) => aiRequest('/compatibility-summary', { method: 'POST', body: JSON.stringify(data) }),
  configureEvent: (data) => aiRequest('/configure-event', { method: 'POST', body: JSON.stringify(data) }),
  mentorInit: (eventId, teamId, participantId) => aiRequest(`/ai-mentor/init?event_id=${eventId}&team_id=${teamId}&participant_id=${participantId}`),
  mentorMessage: (data) => aiRequest('/ai-mentor', { method: 'POST', body: JSON.stringify(data) }),
  mentorContext: (data) => aiRequest('/ai-mentor/context', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── useApi hook ──────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';

export function useApi(apiFn, ...args) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeams, setSelectedTeams] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(args)]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const toggleTeamSelection = (teamId) => {
  setSelectedTeams(prev =>
    prev.includes(teamId)
      ? prev.filter(id => id !== teamId)
      : [...prev, teamId]
  );
};

const toggleSelectAll = () => {
  const draftIds = filteredTeams
    .filter(team => team.status === "DRAFT")
    .map(team => team.id);

  if (selectedTeams.length === draftIds.length) {
    setSelectedTeams([]);
  } else {
    setSelectedTeams(draftIds);
  }
};
  return { data, loading, error, refetch: fetchData };
}