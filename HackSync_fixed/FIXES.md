# HackSync Bug Fixes — Summary

## Bugs Fixed

### 1. Judge Portal "Tampered Link" Error ✅
**File:** `backend/src/routes/judgeAuthRoutes.js`
**Root cause:** Two different JWT secrets were being used — the send-link route used `.env` secret, but verify fell back to a hardcoded string.
**Fix:** Both `adminJudgesRoutes.js` and `judgeAuthRoutes.js` now exclusively use `process.env.JWT_SECRET`. The verify endpoint no longer blocks re-entry (judges can click their link multiple times).

### 2. Participant Portal Email Lookup Broken ✅
**File:** `frontend/src/pages/ParticipantDashboard.jsx`
**Root cause:** Wrong URL — used `/participants/by-email/` instead of `/api/admin/participants/by-email/`.
**Fix:** Corrected API path. Also fixed the dashboard to pass the full participant object (not just ID), and load teams from both PUBLISHED and DRAFT states.

### 3. Can't Generate Teams ✅
**File:** `backend/src/routes/adminTeamRoutes.js`
**Root cause:** Team generation required exactly one Frontend, one Backend, and one Designer participant. Any other skill distribution returned "insufficient coverage" error.
**Fix:** Completely rewritten. Now:
- Tries balanced skill teams first (Frontend/Backend/Designer)
- Falls back to round-robin grouping if skill balance isn't possible
- Supports configurable team size (2–6 members) via `teamSize` param
- Overflow participants are reported but don't block generation

### 4. Judge API Token Passing Broken ✅
**Files:** `frontend/src/api.js`, `frontend/src/components/judge/ScoringPanel.jsx`
**Root cause:** `judgeApi.getTeams()` called without token; `ScoringPanel` submitted to wrong port (8001 instead of 5000).
**Fix:** All judge API calls now send `Authorization: Bearer <token>` header. ScoringPanel submits to `/api/judge/evaluate` on port 5000.

### 5. Missing Approval Gates ✅
**File:** `frontend/src/components/dashboard/TeamsTab.jsx`
**Fix:** Team approval now requires two-click confirmation (button turns red and says "Confirm Publish?"). Added clear warning that teams require committee sign-off before participants are notified.

### 6. Real-Time Data Not Refreshing ✅
**Files:** `frontend/src/pages/JudgeDashboard.jsx`, `frontend/src/components/dashboard/TeamsTab.jsx`
**Fix:** Added polling intervals (15s for admin team view, 30s for judge dashboard) so data stays current without manual refresh.

### 7. Added Missing Endpoints ✅
**File:** `backend/src/routes/adminTeamRoutes.js`
- `GET /api/admin/leaderboard` — returns ranked teams with avg scores
- `GET /api/admin/pending-approvals` — returns draft team + anomaly counts
**File:** `backend/src/routes/adminJudgesRoutes.js`
- `DELETE /api/admin/judges/:id` — delete a judge
- `POST /api/admin/send-participant-emails` — send welcome/update emails to participants

## How to Run

### Backend (Node.js)
```bash
cd backend
cp .env.example .env  # Set DATABASE_URL, JWT_SECRET, SENDGRID_API_KEY
npm install
npx prisma generate
npx prisma migrate dev
npm start            # Port 5000

# In a second terminal:
npm run worker       # Email worker
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Port 5173
```

### Judge Portal Flow
1. Admin adds judges → assigns teams → clicks "Send Judge Links"
2. Judge receives email with magic link `/?token=xxx`
3. Clicking link → App.jsx detects `?token` → shows JudgeVerify screen
4. On success → redirects to JudgeDashboard with their assigned teams

### Participant Portal Flow
1. Navigate to Participant Portal from landing page
2. Enter registered email → fetches participant from `/api/admin/participants/by-email/`
3. Dashboard loads team info from published/draft teams automatically
