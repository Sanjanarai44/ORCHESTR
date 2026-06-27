<div align="center">

<br/>

# ⚡ ORCHESTR

### The AI-powered event operations platform.
#### Run hackathons, case competitions, coding contests, and any judged event — end to end.

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-6366f1?style=for-the-badge&logoColor=white)](https://orchestr-v97d.onrender.com)
&nbsp;
[![Backend API](https://img.shields.io/badge/⚙️_Backend-Docs-0ea5e9?style=for-the-badge)](https://orchestr-backend-8u5k.onrender.com)
&nbsp;
[![AI Server](https://img.shields.io/badge/🤖_AI_Server-Swagger-8b5cf6?style=for-the-badge)](https://orchestr-ai.onrender.com/docs)

<br/>

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat-square&logo=node.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15-336791?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_3.5-D97706?style=flat-square&logo=anthropic&logoColor=white)
![GPT-4o](https://img.shields.io/badge/GPT--4o_mini-412991?style=flat-square&logo=openai&logoColor=white)

<br/>

</div>

---

## 👀 Preview

<table>
  <tr>
    <td><img src="./HackSync_fixed/docs/images/landing.png" alt="Landing Page"/><br/><sub>Landing Page</sub></td>
    <td><img src="./HackSync_fixed/docs/images/dashboard.png" alt="Organiser Dashboard"/><br/><sub>Organiser Dashboard</sub></td>
  </tr>
  <tr>
    <td><img src="./HackSync_fixed/docs/images/judge-portal.png" alt="Judge Portal"/><br/><sub>Judge Portal</sub></td>
    <td><img src="./HackSync_fixed/docs/images/participant-dashboard.png" alt="Participant Dashboard"/><br/><sub>Participant Dashboard</sub></td>
  </tr>
</table>

---

## What is ORCHESTR?

ORCHESTR handles the full lifecycle of any competition-style event — for any format that has **participants, teams, judges, and a leaderboard**.

Works for: `hackathons` · `case competitions` · `design sprints` · `coding contests` · `any judged event`

**Core pipeline:**
- Upload a participant CSV → AI forms balanced teams with rationale
- Judges get magic links → score teams → anomalies flagged in real time
- Z-score normalisation corrects for harsh/lenient judge bias automatically
- Results emails are AI-drafted and sent async via a job queue

---

## 📖 Table of Contents

| | |
|---|---|
| [Core Features](#-core-features) | [Architecture](#-architecture) |
| [Tech Stack](#-tech-stack) | [Database Schema](#-database-schema) |
| [Prerequisites](#-prerequisites) | [Installation & Setup](#-installation--setup) |
| [User Flows](#-user-flows) | [API Reference](#-api-reference) |
| [Deployment](#-deployment) | [Troubleshooting](#-troubleshooting) |

---

## ✨ Core Features

### 🤖 AI Event Configuration
Describe your event in plain English — AI extracts the full config:
- Event type, team size, number of stages, scoring criteria, judge count, advancement rules
- Multi-turn conversation: if something is ambiguous, AI asks a follow-up instead of guessing
- Returns structured JSON config ready to save — no parsing needed

### 📂 CSV Roster Ingestion & Smart Team Formation
- Upload any CSV with `name, email, college, skill` — fuzzy column matching included
- Skill normalisation: `"fe"`, `"react"`, `"front-end"` → `Frontend`; `"pm"`, `"api"` → `Backend`; `"figma"`, `"ux"` → `Designer`
- Tries skill-balanced teams (Frontend + Backend + Designer) first; falls back to round-robin
- GPT-4o writes a rationale for every team — why they're strong, why the mix works
- Teams stay in `DRAFT` until organiser does a two-click confirm — no accidental publishes

### ⚖️ Real-Time Anomaly Detection
Runs automatically after every judge submission:
- Computes panel average for the team from all prior judges
- Flags if deviation exceeds a configurable threshold (default: 2.0, range: 0.1–10.0)
- Holds that team's leaderboard position until the flag is resolved
- Broadcasts `anomaly:new` via WebSocket to the organiser dashboard instantly
- Queues a Celery task for an async LLM explanation of the flag

Organiser resolves each flag with: **Accept** · **Discard** (soft-delete the score) · **Override** (set manual score)

### 📊 Z-Score Normalisation & Judge Calibration
Corrects for judges who are systematically harsh or lenient:

```
normalised_score = clamp(5.5 + z × 1.5,  min=1.0, max=10.0)
where  z = (raw_score − judge_mean) / max(judge_std, 1.5)
```

- Per-judge: average, standard deviation, bias label (Harsh / Neutral / Lenient)
- AI generates a 3-sentence behavioural summary per judge for the committee
- Side-by-side **Raw vs. Normalised leaderboard** with rank-change indicators
- Z-score is **toggleable** — organiser decides which ranking to publish

### 🐙 GitHub Contribution Analyzer
Link a GitHub repo to a team. ORCHESTR pulls commits, PRs, and issues via the GitHub API and scores each member:

```
score = commits × 1  +  pull_requests × 5  +  issues × 2
```

- Flags `Low Participation` (< 5% of total score) and `Dominating Contributions` (> 70%)
- Gives organisers objective data on who actually built what

### 🧠 Socratic AI Mentor (Claude 3.5 Haiku)
- Locked behind a **problem statement requirement** — mentor refuses all interaction until the team defines what they're building
- Every Claude response is validated in a loop before reaching the UI:
  - Contains code block? → Regenerate
  - Contains imperative phrases ("you should", "implement", "build")? → Regenerate
  - Doesn't end with a `?`? → Regenerate
- Never gives answers — always ends with a guiding question
- Admin can view all team conversations in a read-only log

### 📬 Async Email Pipeline
- All emails go through a **BullMQ Redis queue** — nothing blocks the API
- Judge magic links (JWT-signed, 48hr expiry), participant welcome emails, AI-drafted results emails
- Every delivery attempt logged to `EmailLog` with status, attempts, and error messages
- Fallback email template always ready if LLM call fails

### 🔐 Multi-Method Auth
| Role | Method |
|---|---|
| Organiser | Email + password (bcrypt) · Google OAuth 2.0 · GitHub OAuth |
| Judge | JWT magic link via email — no password needed |
| Participant | Email lookup + OTP |

---

## 🏛 Architecture

![ORCHESTR System Architecture](./HackSync_fixed/docs/images/architecture.png)

| Service | Port | Role |
|---|---|---|
| React Frontend | `5173` | All UI — Organiser, Judge, Participant portals |
| Node.js Backend | `5000` | REST API, Auth, DB, Email queue |
| FastAPI AI Backend | `8000` | All LLM calls (GPT-4o-mini + Claude 3.5 Haiku) |
| PostgreSQL | `5432` | Primary database |
| Redis | `6380` | BullMQ job queue |

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS 3, React Router v7, Axios, Lucide React |
| **Backend** | Express 5, Prisma 5, BullMQ, JWT, Passport.js (Google + GitHub OAuth), SendGrid, Multer, csv-parser |
| **AI Backend** | FastAPI, Uvicorn, OpenAI SDK → OpenRouter (GPT-4o-mini), Anthropic SDK (Claude 3.5 Haiku), httpx |
| **Infrastructure** | PostgreSQL 15, Redis 7, Docker, Render |

---

## 📐 Database Schema

![ER Diagram](./HackSync_fixed/docs/images/er-diagram.png)

<details>
<summary>View text schema</summary>

```
Event
 ├── Participant[]        name, email, college, skill, stage, qualified
 ├── Team[]
 │    ├── TeamMember[]
 │    ├── Evaluation[]    scoreCode, scoreInnovation, scorePresentation, discarded, overrideScore
 │    ├── AnomalyFlag[]   newScore, panelAvg, deviation, llmExplanation, status, resolution
 │    ├── MentorConversation[]
 │    └── GithubRepo → GithubAnalysis[]   commits, pullRequests, issues, contributionScore
 ├── Judge[]              jwtToken, tokenUsed, assignedTeams[]
 └── Feedback[]

EmailLog · AiEmailContent · OtpCode · Organizer · EventSettings (key-value config store)
```

</details>

---

## ⚙️ Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| Docker Desktop | Latest |

**API Keys needed:**

| Service | For | Get it |
|---|---|---|
| OpenRouter | GPT-4o-mini | [openrouter.ai/keys](https://openrouter.ai/keys) |
| SendGrid | Emails | [app.sendgrid.com](https://app.sendgrid.com/) |
| Anthropic *(optional)* | AI Mentor (Claude) | [console.anthropic.com](https://console.anthropic.com/) |
| GitHub Token *(optional)* | Higher API rate limit | [github.com/settings/tokens](https://github.com/settings/tokens) |

---

## 🚀 Installation & Setup

### 1 — Clone

```bash
git clone https://github.com/Sanjanarai44/ORCHESTR.git
cd ORCHESTR/HackSync_fixed
```

### 2 — Environment Files

**`backend/.env`**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hackathon_db
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173

OPENROUTER_API_KEY=<your_key>
GITHUB_TOKEN=<your_token>          # optional

SENDGRID_API_KEY=<your_key>
SENDGRID_FROM_EMAIL=<verified_sender>
COMMITTEE_EMAIL=<your_email>

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6380

JWT_SECRET=<long_random_string>
SESSION_SECRET=<long_random_string>
JWT_EXPIRY_HOURS=48
```

> Generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

**`frontend/.env`**
```env
VITE_NODE_URL=http://localhost:5000
VITE_AI_URL=http://localhost:8000
```

**`ai-backend/.env`**
```env
OPENROUTER_API_KEY=<your_key>
ANTHROPIC_API_KEY=<your_key>
NODE_URL=http://localhost:5000
```

### 3 — Start Docker

```powershell
# PostgreSQL
docker run -d --name hacksync-postgres `
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=hackathon_db `
  -p 5432:5432 postgres:15

# Redis
docker run -d --name hacksync-redis -p 6380:6379 redis:7-alpine
```

Or with Docker Compose: `docker compose up -d`

### 4 — Install Dependencies

```powershell
cd backend && npm install
cd ../frontend && npm install
cd ../ai-backend && pip install -r requirements.txt
```

### 5 — Database Setup

```powershell
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 6 — Run (4 terminals from `HackSync_fixed/`)

| Terminal | Command | Expected output |
|---|---|---|
| 1 | `cd backend && npm run dev` | `Server running on port 5000` |
| 2 | `cd backend && npm run worker` | `Email Worker Started` |
| 3 | `cd ai-backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload` | `Uvicorn running on http://0.0.0.0:8000` |
| 4 | `cd frontend && npm run dev` | `Local: http://localhost:5173/` |

**Access:**

| | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| AI Backend | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Prisma Studio | http://localhost:5555 *(run `npx prisma studio`)* |

---

## 🔄 User Flows

### Organiser
```
Login → Create Event (AI-assisted) → Upload CSV → Generate Teams
→ Review AI rationales → Publish (two-click confirm)
→ Add Judges → Send Magic Links
→ Monitor evaluations (live WebSocket) → Review anomaly flags
→ Check calibration report → Toggle Z-score normalisation
→ Compare raw vs. normalised leaderboard → Publish results + send emails
```

### Judge
```
Receive magic link email → Click link (auto-verified, no password)
→ Score each assigned team: Code + Innovation + Presentation (0–10) + comment
→ Auto-advances to next team after submission
→ Anomaly flagged automatically if score deviates > threshold from panel avg
```

### Participant
```
Enter registered email → OTP verify
→ View team dashboard: members, skills, GitHub contribution tracker
→ Set problem statement → Chat with Socratic AI Mentor
→ Receive result email when organiser publishes
```

---

## 📡 API Reference

### Node.js Backend — Port 5000

**Auth**
| Method | Endpoint | |
|---|---|---|
| POST | `/auth/register` | Register organiser |
| POST | `/auth/login` | Login |
| GET | `/auth/google` | Google OAuth |
| GET | `/auth/github` | GitHub OAuth |

**Events & Roster**
| Method | Endpoint | |
|---|---|---|
| GET/POST | `/api/admin/events` | List / create events |
| DELETE | `/api/admin/events/:id` | Delete event |
| POST | `/api/admin/upload-roster` | Upload participant CSV |
| GET | `/api/admin/participants` | List participants |
| GET | `/api/admin/participants/by-email/:email` | Lookup by email |

**Teams**
| Method | Endpoint | |
|---|---|---|
| POST | `/api/admin/generate-teams` | AI team formation |
| GET | `/api/admin/teams` | List teams |
| POST | `/api/admin/publish-teams` | Publish teams |
| GET | `/api/admin/leaderboard` | Ranked leaderboard |
| GET | `/api/admin/pending-approvals` | Draft + anomaly counts |

**Judges**
| Method | Endpoint | |
|---|---|---|
| GET/POST | `/api/admin/judges` | List / add judges |
| DELETE | `/api/admin/judges/:id` | Delete judge |
| POST | `/api/admin/send-judge-links` | Send magic link emails |
| POST | `/api/judge/evaluate` | Submit evaluation |

**Calibration**
| Method | Endpoint | |
|---|---|---|
| GET | `/api/admin/calibration/judge-calibration-report` | Per-judge bias + Z-score data |
| POST | `/api/admin/calibration/judge-calibration-report/generate-summaries` | Trigger AI summaries |
| GET | `/api/admin/calibration/leaderboard/comparison` | Raw vs. normalised diff |
| POST | `/api/admin/calibration/settings/zscore-normalisation` | Toggle Z-score |
| POST | `/api/admin/calibration/settings/anomaly-threshold` | Set threshold |
| POST | `/api/admin/calibration/run-post-normalisation-check` | Re-run anomaly check |

**Anomalies**
| Method | Endpoint | |
|---|---|---|
| GET | `/api/admin/anomaly-flags` | List flags |
| POST | `/api/anomalies/:flagId/accept` | Accept score |
| POST | `/api/anomalies/:flagId/discard` | Soft-delete score |
| POST | `/api/anomalies/:flagId/override` | Set manual score |

**GitHub Analyzer**
| Method | Endpoint | |
|---|---|---|
| POST | `/api/github/connect` | Link repo to event |
| POST | `/api/github/analyze/team/:teamId` | Run contribution analysis |
| GET | `/api/github/team/:teamId/leaderboard` | Get contribution scores |

**Mentor & Comms**
| Method | Endpoint | |
|---|---|---|
| GET | `/api/mentor/session` | Team conversation history |
| POST | `/api/mentor/message` | Send message to AI mentor |
| PUT | `/api/mentor/context` | Update problem statement |
| GET | `/api/admin/mentor-logs` | All conversations (admin) |
| POST | `/api/admin/send-participant-emails` | Bulk email participants |

---

### AI Backend — Port 8000

| Method | Endpoint | |
|---|---|---|
| POST | `/configure-event` | Conversational event config |
| POST | `/generate-rationale` | Team rationale (GPT-4o-mini) |
| POST | `/draft-email` | Notification email body |
| POST | `/draft-results-email` | Results HTML email |
| POST | `/calibration-summary` | Judge bias text |
| POST | `/explain-anomaly` | Anomaly explanation + recommendation |
| POST | `/generate-rubric` | Judging rubric |
| POST | `/synthesize-feedback` | Theme extraction from feedback |
| POST | `/ai-mentor` | Socratic mentor (Claude) |
| POST | `/ai-assistant` | General event assistant |
| GET | `/docs` | Swagger UI |

---

## ☁️ Deployment

| Service | URL |
|---|---|
| Frontend | https://orchestr-v97d.onrender.com |
| Backend | https://orchestr-backend-8u5k.onrender.com |
| AI Backend | https://orchestr-ai.onrender.com |

**Production frontend env:**
```env
VITE_NODE_URL=https://orchestr-backend-8u5k.onrender.com
VITE_AI_URL=https://orchestr-ai.onrender.com
```

Build: `cd frontend && npm run build` → output in `frontend/dist/`

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| Redis connection refused | `docker exec hacksync-redis redis-cli ping` → expect `PONG`. If not: `docker start hacksync-redis` |
| Prisma client error | `npx prisma generate && npx prisma migrate dev` |
| Port in use | `netstat -ano \| findstr :5000` → `taskkill /PID <PID> /F` |
| Docker stopped | `docker start hacksync-postgres hacksync-redis` |
| AI backend won't start | `pip install -r requirements.txt --upgrade` |
| GitHub Analyzer rate limit | Add `GITHUB_TOKEN` to `backend/.env` |
| Judge link "tampered" error | Click "Send Links" again — regenerates fresh JWTs |

---

## 🔁 Quick Restart

```powershell
docker start hacksync-postgres hacksync-redis

# 4 terminals:
cd backend && npm run dev
cd backend && npm run worker
cd ai-backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
cd frontend && npm run dev
```

---

## 📁 Repo Structure

```
ORCHESTR/
├── README.md
└── HackSync_fixed/
    ├── docs/images/           ← Add screenshots + PPT exports here
    ├── frontend/src/
    │   ├── pages/             ← LandingPage, AdminDashboard, JudgeEvaluate, AIMentor, ...
    │   ├── components/
    │   └── api.js
    ├── backend/src/
    │   ├── routes/            ← All API handlers
    │   ├── services/          ← githubService.js, otpService.js
    │   ├── workers/           ← emailWorker.js
    │   └── queues/
    ├── backend/prisma/
    │   └── schema.prisma
    └── ai-backend/
        └── main.py
```

---

<div align="center">
<br/>

**Built for every organiser who's ever managed a competition in a spreadsheet.**

*ORCHESTR — Conduct your events.*

[![Try It Live](https://img.shields.io/badge/Try_It_Live-6366f1?style=for-the-badge)](https://orchestr-v97d.onrender.com)

</div>
