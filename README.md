<div align="center">

<br/>

```
 ██████╗ ██████╗  ██████╗██╗  ██╗███████╗███████╗████████╗██████╗
██╔═══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔════╝╚══██╔══╝██╔══██╗
██║   ██║██████╔╝██║     ███████║█████╗  ███████╗   ██║   ██████╔╝
██║   ██║██╔══██╗██║     ██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██╗
╚██████╔╝██║  ██║╚██████╗██║  ██║███████╗███████║   ██║   ██║  ██║
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝  ╚═╝  ╚═╝
```

### **The AI-powered event operations platform.**
### Run hackathons, case competitions, and any judged event — end to end.

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-6366f1?style=for-the-badge&logoColor=white)](https://orchestr-v97d.onrender.com)
&nbsp;
[![Backend API](https://img.shields.io/badge/⚙️_Backend_API-Docs-0ea5e9?style=for-the-badge)](https://orchestr-backend-8u5k.onrender.com)
&nbsp;
[![AI Server](https://img.shields.io/badge/🤖_AI_Server-Swagger-8b5cf6?style=for-the-badge)](https://orchestr-ai.onrender.com/docs)

<br/>

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat-square&logo=node.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15-336791?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_5-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_3.5-D97706?style=flat-square&logo=anthropic&logoColor=white)
![GPT-4o](https://img.shields.io/badge/GPT--4o_mini-412991?style=flat-square&logo=openai&logoColor=white)

</div>

---

> **ORCHESTR** is a full-stack, multi-role platform that orchestrates the entire lifecycle of any competition-style event — from participant registration and AI-assisted team formation, through judge evaluation with real-time anomaly detection and Z-score normalisation, to automated result delivery. Built so that one organiser can run what used to take a full operations team.

---

## 📖 Table of Contents

| # | Section |
|---|---|
| 1 | [What is ORCHESTR?](#-what-is-orchestr) |
| 2 | [Who is it for?](#-who-is-it-for) |
| 3 | [Core Feature Deep-Dives](#-core-feature-deep-dives) |
| 4 | [Architecture](#-architecture) |
| 5 | [Tech Stack](#-tech-stack) |
| 6 | [Screenshots](#-screenshots) |
| 7 | [Prerequisites](#-prerequisites) |
| 8 | [Installation & Setup](#-installation--setup) |
| 9 | [User Flows](#-user-flows) |
| 10 | [API Reference](#-api-reference) |
| 11 | [Database Schema](#-database-schema) |
| 12 | [Deployment](#-deployment) |
| 13 | [Troubleshooting](#-troubleshooting) |

---

## 🎯 What is ORCHESTR?

ORCHESTR replaces the spreadsheets, WhatsApp groups, and manual coordination that plague every competition organiser.

**In one platform:**

- **Upload** a participant CSV → teams are auto-formed with AI rationale in seconds
- **Judges** get magic links, score teams, and anomalies are flagged automatically in real time
- **Z-score normalisation** ensures a lenient judge doesn't unfairly crown a winner
- **GitHub Analyzer** tracks actual code contribution per team member — no free-riders
- **Socratic AI Mentor** guides participants without giving away answers
- **Emails** are AI-drafted and sent asynchronously via a job queue — no SMTP babysitting

It works for **hackathons, case competitions, design sprints, coding contests** — any event that has participants, teams, judges, and a leaderboard.

---

## 👥 Who is it for?

| Role | What they get |
|---|---|
| 🧑‍💼 **Organiser** | Full event control: CSV upload, AI team formation, judge management, calibration, anomaly review, leaderboard, automated emails |
| ⚖️ **Judge** | One-click magic link access, clean scoring interface, auto-advance after each submission |
| 🧑‍💻 **Participant** | Team dashboard, GitHub contribution tracker, Socratic AI Mentor, real-time stage updates |

---

## 🔬 Core Feature Deep-Dives

### 1. 🤖 AI Event Configuration (Conversational Setup)

> *"I want a 3-stage hackathon, 3 members per team, 5 judges scoring on Innovation, Code Quality, and Business Impact, top 10 teams advance."*

That single sentence is all it takes. The `/configure-event` endpoint uses **GPT-4o-mini via OpenRouter** in a multi-turn conversation loop. The AI extracts:

- Event type (hackathon / case competition / coding contest / other)
- Team size, number of stages, advancement rules
- Scoring criteria and number of judges
- Communication touchpoints (which emails to send at which stage)

If any field is ambiguous, the AI asks a targeted clarifying question instead of guessing. The response is always a structured JSON config — no parsing heuristics needed. The organiser reviews the extracted config, confirms, and it's saved to PostgreSQL immediately.

```
User: "3-day hackathon, 4 per team, 8 judges"
AI:   { "clarification_needed": "How many teams should advance to the final round?" }
User: "Top 5"
AI:   { "event_name": "...", "team_size": 4, "num_judges": 8, "advancement_rule": "top 5 teams advance", ... }
```

---

### 2. 📂 CSV Roster Ingestion & Skill-Aware Team Formation

Upload any CSV with columns: `name, email, college, skill` (column names are fuzzy-matched). ORCHESTR:

1. **Normalises skills** — `"fe"`, `"react"`, `"front-end"`, `"ui"` all map to `Frontend`; `"pm"`, `"api"`, `"back-end"` map to `Backend`; `"figma"`, `"ux"`, `"graphic"` map to `Designer`
2. **Upserts participants** — re-uploading is safe, existing records are updated not duplicated
3. **Forms balanced teams** — tries `Frontend + Backend + Designer` combos first; falls back to **round-robin** if the skill distribution doesn't allow perfect balance
4. **AI rationale per team** — GPT-4o writes a 2-3 sentence justification for why each team is strong and well-matched (diversity of skills, institutions)
5. **Reports overflow** — leftover participants who didn't fit a complete team are listed but don't block generation

Teams are created as `DRAFT` and require explicit organiser approval (two-click confirmation) before participants are notified.

---

### 3. ⚖️ Judge Evaluation & Real-Time Anomaly Detection

Each judge scores teams on three criteria: **Code Quality**, **Innovation**, **Presentation** (each 0–10), plus an optional star rating and a comment (minimum 20 characters enforced).

**Anomaly detection runs immediately after every submission:**

```
Algorithm:
1. Fetch all prior scores for this team (excluding the current judge)
2. If < 1 prior score exists → skip (not enough data)
3. Compute panel average = mean of (code + innovation + presentation) / 3
4. Compute deviation = |new_score - panel_avg|
5. Compare to configurable threshold (default: 2.0, range: 0.1–10.0)
6. If deviation > threshold:
   → Create AnomalyFlag record
   → Set team.resultsHeld = true (blocks leaderboard for this team)
   → Broadcast WebSocket event "anomaly:new" to organiser dashboard
   → Queue async Celery task for LLM explanation
```

The organiser then reviews each flag with a full AI-generated explanation and chooses to:
- ✅ **Accept** — keep the score, resolve the flag
- 🗑️ **Discard** — soft-delete the score (marked `discarded=true`, excluded from leaderboard)
- ✏️ **Override** — set a manual score between 1.0–10.0

All resolutions broadcast via WebSocket so the dashboard updates in real time without refresh.

---

### 4. 📊 Z-Score Normalisation & Judge Calibration

This is the system that makes results **fair** even when judges have wildly different grading tendencies.

**The problem:** Judge A scores everyone 7–9 (lenient). Judge B scores everyone 4–6 (harsh). The raw leaderboard favours Judge A's teams unfairly.

**The solution — Z-score normalisation:**

```
For each judge j:
  mean_j   = average score across all teams they evaluated
  std_j    = standard deviation of their scores
  floor_j  = max(std_j, 1.5)   ← prevents division by near-zero

For each evaluation e by judge j:
  z         = (e.score - mean_j) / floor_j
  normalised = clamp(5.5 + z × 1.5, min=1.0, max=10.0)
```

This re-centres every judge around a common mean (5.5) with consistent spread (1.5). A team that genuinely impressed a harsh judge will score higher than one that merely satisfied a lenient judge.

**The calibration dashboard shows per-judge:**
- Average score vs. global panel average
- Standard deviation (consistency indicator)
- Bias label: **Harsh** (avg < global − 1.5) / **Neutral** / **Lenient** (avg > global + 1.5)
- AI-generated 3-sentence summary of scoring behaviour and committee recommendation
- Side-by-side: **Raw Leaderboard** vs. **Normalised Leaderboard** with rank change indicators

Z-score normalisation is **toggleable** — the organiser can switch between raw and normalised rankings and see which teams change position before deciding which to publish.

---

### 5. 🐙 GitHub Contribution Analyzer

Teams link their GitHub repository URL. ORCHESTR pulls the full commit history, PRs, and issues via the **GitHub REST API** (paginated, authenticated) and computes a weighted contribution score per member:

```
Score = (commits × 1) + (pull_requests × 5) + (issues × 2)
```

PRs are weighted 5× because they represent reviewed, production-ready work. Issues represent active participation in project planning.

Each contributor also gets a **participation status:**
- `Low Participation` — contributed < 5% of total score
- `Normal` — standard participation
- `Dominating Contributions` — single contributor > 70% of score (potential concern flag)

This gives organisers objective data on team dynamics, and gives participants a transparent view of who is actually building.

---

### 6. 🧠 Socratic AI Mentor (Claude 3.5 Haiku)

Powered by **Anthropic Claude 3.5 Haiku**, the AI Mentor is available to every team during the hacking phase. It is specifically designed **not** to give answers.

**Hard rules enforced in code (not just the system prompt):**

1. **Problem Statement Lock** — The mentor refuses all interaction until the team explicitly sets a problem description. This forces teams to articulate what they're building before asking for help.

2. **Output Validation Loop** — Every Claude response is validated before it reaches the UI:
   - ❌ Contains code block (``` or tab-indented code)? → Regenerate
   - ❌ Contains imperative phrases ("you should", "implement", "build", "try doing")? → Regenerate
   - ❌ Does not end with a `?` (Socratic question)? → Regenerate
   - Up to 2 regeneration attempts before falling back to: *"What aspect of your problem feels most unclear right now?"*

3. **Context Boundary** — The system prompt is injected with the team's problem description and instructs the model to refuse all out-of-scope questions (e.g., unrelated algorithms, travel advice, random LeetCode problems).

4. **Conversation History** — Last 20 messages are retained per team for continuity. Admins get a read-only log of all conversations grouped by team.

---

### 7. 📬 Async Email Pipeline (BullMQ + SendGrid)

Emails are never sent synchronously. Every email job is pushed to a **BullMQ Redis queue** and processed by a dedicated `emailWorker.js` process:

- **Magic link emails** to judges (JWT-signed, 48hr expiry)
- **Welcome emails** to participants after team assignment
- **Results emails** — AI-drafted HTML email with rank, score, and congratulations copy

The AI (`/draft-results-email`) generates personalised HTML email bodies. A fallback template is always ready if the LLM call fails. Email delivery status, attempts, and errors are all logged to `EmailLog` in PostgreSQL.

---

### 8. 🔐 Authentication System

| User Type | Method |
|---|---|
| **Organiser** | Email + password (bcrypt) OR Google OAuth 2.0 OR GitHub OAuth |
| **Judge** | JWT magic link via email — no password, single-click access |
| **Participant** | Email lookup + OTP verification |

Judge tokens are re-issuable (clicking a new "Send Links" resets `token_used = false`). A judge can re-enter via their link multiple times — sessions don't expire mid-event.

---

## 🏛 Architecture

> *Add your architecture PPT slide here: save it as `./docs/images/architecture.png`*

![ORCHESTR System Architecture](./docs/images/architecture.png)

```
┌────────────────────────────────────────────────────────────────┐
│                        ORCHESTR Platform                       │
│                                                                │
│  ┌─────────────────┐   REST/WS    ┌──────────────────────────┐ │
│  │  React 19 SPA   │◄────────────►│   Node.js / Express 5    │ │
│  │  Vite + Tailwind│              │        Port 5000          │ │
│  │   Port 5173     │   REST       │                          │ │
│  │                 │◄────────────►│  ┌──────────────────────┐│ │
│  │  • Organiser    │              │  │   Prisma ORM v5      ││ │
│  │  • Judge        │              │  └──────────┬───────────┘│ │
│  │  • Participant  │              │             │             │ │
│  └─────────────────┘              │  ┌──────────▼───────────┐│ │
│                                   │  │   PostgreSQL 15      ││ │
│  ┌─────────────────┐              │  └──────────────────────┘│ │
│  │  FastAPI + Python│  Proxy/AI   │                          │ │
│  │   Port 8000     │◄────────────►│  ┌──────────────────────┐│ │
│  │                 │              │  │  Redis + BullMQ      ││ │
│  │  GPT-4o-mini    │              │  │  (Email Job Queue)   ││ │
│  │  Claude 3.5     │              │  └──────────────────────┘│ │
│  │  (OpenRouter)   │              └──────────────────────────┘ │
│  └─────────────────┘                                           │
└────────────────────────────────────────────────────────────────┘
```

| Service | Port | Responsibility |
|---|---|---|
| React Frontend | `5173` | All UI — Organiser, Judge, Participant portals |
| Node.js Backend | `5000` | REST API, Auth, DB writes, Email queue |
| FastAPI AI Backend | `8000` | All LLM calls (GPT-4o-mini, Claude 3.5 Haiku) |
| PostgreSQL | `5432` | Single source of truth — all persistent data |
| Redis | `6380` | BullMQ email job queue + anomaly job queue |

---

## 🛠 Tech Stack

<details>
<summary><strong>Frontend</strong></summary>

| Technology | Purpose |
|---|---|
| React 19 + Vite 8 | SPA framework |
| Tailwind CSS 3 | Utility-first styling |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Lucide React | Icon library |

</details>

<details>
<summary><strong>Backend (Node.js)</strong></summary>

| Technology | Purpose |
|---|---|
| Express 5 | REST API server |
| Prisma 5 | ORM + migrations for PostgreSQL |
| BullMQ + ioredis | Async job queue (emails, anomaly checks) |
| jsonwebtoken + bcryptjs | JWT auth + password hashing |
| Passport.js | Google OAuth 2.0 + GitHub OAuth |
| @sendgrid/mail | Transactional email delivery |
| Multer + csv-parser | CSV file upload and parsing |
| Axios | GitHub API calls |
| nodemon | Development hot-reload |

</details>

<details>
<summary><strong>AI Backend (Python)</strong></summary>

| Technology | Purpose |
|---|---|
| FastAPI + Uvicorn | Async API server |
| OpenAI SDK → OpenRouter | GPT-4o-mini (team rationale, event config, emails, anomaly explanation) |
| Anthropic SDK | Claude 3.5 Haiku (Socratic AI Mentor) |
| httpx | Async HTTP proxy to Node backend |
| SQLite | Local mentor conversation cache |
| python-dotenv | Environment variable management |

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary relational database |
| Redis 7 Alpine | Job queue backend |
| Docker + Docker Compose | Local container orchestration |
| Render | Cloud deployment (all 3 services) |

</details>

---

## 📸 Screenshots

> **For you:** Save real screenshots of your app to `./docs/images/` and they'll show up here automatically.

### Landing Page
![Landing Page](./docs/images/landing.png)

### Organiser Dashboard — Team Management
![Admin Dashboard](./docs/images/dashboard.png)

### AI Event Configuration
![Event Setup](./docs/images/event-setup.png)

### Judge Evaluation Portal
![Judge Portal](./docs/images/judge-portal.png)

### Z-Score Calibration & Judge Calibration Report
![Calibration Dashboard](./docs/images/calibration.png)

### Live Leaderboard (Raw vs. Normalised)
![Leaderboard](./docs/images/leaderboard.png)

### GitHub Contribution Analyzer
![GitHub Analyzer](./docs/images/github-analyzer.png)

### Anomaly Flag Review Panel
![Anomaly Panel](./docs/images/anomaly.png)

### Participant Dashboard
![Participant Dashboard](./docs/images/participant-dashboard.png)

### Socratic AI Mentor Chat
![AI Mentor](./docs/images/ai-mentor.png)

---

## 📐 Database Schema

> *Add your ER diagram from your PPT here: save it as `./docs/images/er-diagram.png`*

![ER Diagram](./docs/images/er-diagram.png)

<details>
<summary><strong>View text schema</strong></summary>

```
Event
 ├── id, name, eventType, status, config, organizerId
 ├── Participant[]
 │    └── id, name, email, college, skill, stage, qualified, inviteStatus
 ├── Team[]
 │    ├── id, name, status (DRAFT/PUBLISHED), aiRationale, problemStatement
 │    ├── resultsHeld (true while anomaly is pending)
 │    ├── TeamMember[]       — name, email, skill, college
 │    ├── Evaluation[]       — scoreCode, scoreInnovation, scorePresentation
 │    │                         starRating, comment, discarded, overrideScore
 │    ├── AnomalyFlag[]      — newScore, panelAvg, deviation, llmExplanation
 │    │                         status (PENDING/RESOLVED), resolution (accepted/discarded/overridden)
 │    ├── MentorConversation[] — role, content, timestamp, participantId
 │    └── GithubRepo?
 │         └── GithubAnalysis[] — githubUsername, commits, pullRequests, issues, contributionScore
 ├── Judge[]                 — email, name, jwtToken, tokenUsed, assignedTeams[]
 ├── Feedback[]              — starRating, timelineClear, aiMentorUseful, openText
 └── GithubRepo[]

Supporting Tables:
  EmailLog         — recipientEmail, emailType, status, attempts, errorMessage
  AiEmailContent   — AI-drafted subject + htmlBody cache
  OtpCode          — participant OTP verification
  Organizer        — email, password (bcrypt), authProvider, providerId, avatarUrl
  EventSettings    — key-value store for per-event config (thresholds, Z-score toggle, summaries)
```

</details>

---

## ⚙️ Prerequisites

| Tool | Minimum Version | Download |
|---|---|---|
| Node.js | 18.x | [nodejs.org](https://nodejs.org/) |
| Python | 3.10 | [python.org](https://python.org/) |
| Docker Desktop | Latest | [docker.com](https://docker.com/get-started/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

**API Keys needed:**
| Service | Purpose | Get it |
|---|---|---|
| OpenRouter | GPT-4o-mini calls | [openrouter.ai/keys](https://openrouter.ai/keys) |
| SendGrid | Transactional email | [app.sendgrid.com](https://app.sendgrid.com/) |
| Anthropic *(optional)* | Claude-powered Mentor | [console.anthropic.com](https://console.anthropic.com/) |
| GitHub Token *(optional)* | Higher API rate limits for GitHub Analyzer | [github.com/settings/tokens](https://github.com/settings/tokens) |

---

## 🚀 Installation & Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Sanjanarai44/ORCHESTR.git
cd ORCHESTR/HackSync_fixed
```

---

### Step 2 — Create Environment Files

#### `backend/.env`

```env
# ── Database ──────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5432/hackathon_db

# ── Server ────────────────────────────────────────
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173

# ── AI (OpenRouter) ───────────────────────────────
OPENROUTER_API_KEY=<your_openrouter_key>

# ── GitHub Analyzer (optional, increases rate limits)
GITHUB_TOKEN=<your_github_personal_access_token>

# ── Email (SendGrid) ──────────────────────────────
SENDGRID_API_KEY=<your_sendgrid_key>
SENDGRID_FROM_EMAIL=<your_verified_sender_email>
COMMITTEE_EMAIL=<organiser_notification_email>

# ── Redis ─────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6380

# ── Auth ──────────────────────────────────────────
JWT_SECRET=<generate_a_long_random_string>
SESSION_SECRET=<generate_a_long_random_string>
JWT_EXPIRY_HOURS=48
```

> 💡 Generate strong secrets:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

#### `frontend/.env`

```env
VITE_NODE_URL=http://localhost:5000
VITE_AI_URL=http://localhost:8000
```

#### `ai-backend/.env`

```env
OPENROUTER_API_KEY=<your_openrouter_key>
ANTHROPIC_API_KEY=<your_anthropic_key>
NODE_URL=http://localhost:5000
```

---

### Step 3 — Start Docker Services

```powershell
# PostgreSQL
docker run -d `
  --name hacksync-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=hackathon_db `
  -p 5432:5432 `
  postgres:15

# Redis
docker run -d `
  --name hacksync-redis `
  -p 6380:6379 `
  redis:7-alpine
```

Or use Docker Compose (starts both at once):

```bash
docker compose up -d
```

Verify both are running:

```powershell
docker ps
# Both containers should show STATUS: Up
```

---

### Step 4 — Install Dependencies

```powershell
# Node.js Backend
cd backend
npm install

# React Frontend
cd ../frontend
npm install

# Python AI Backend
cd ../ai-backend
pip install -r requirements.txt
```

---

### Step 5 — Database Setup

```powershell
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init
```

Optional — Open visual database browser:

```powershell
npx prisma studio
# Opens at http://localhost:5555
```

---

### Step 6 — Run the Project

Open **4 separate terminals** from `HackSync_fixed/`:

#### Terminal 1 — Node.js API Server
```powershell
cd backend
npm run dev
```
```
✅  Server running on port 5000
✅  Database connected
```

#### Terminal 2 — Email Worker (BullMQ)
```powershell
cd backend
npm run worker
```
```
✅  Email Worker Started
✅  Listening for jobs on: email-queue
```

#### Terminal 3 — AI Backend (FastAPI)
```powershell
cd ai-backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
```
✅  Application startup complete.
✅  Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 4 — React Frontend (Vite)
```powershell
cd frontend
npm run dev
```
```
✅  VITE ready in ~400ms
✅  Local: http://localhost:5173/
```

---

### ✅ Everything is running!

| Service | URL |
|---|---|
| 🌐 **Frontend** | http://localhost:5173 |
| ⚙️ **Backend API** | http://localhost:5000 |
| 🤖 **AI Backend** | http://localhost:8000 |
| 📚 **AI Swagger Docs** | http://localhost:8000/docs |
| 🔬 **Prisma Studio** | http://localhost:5555 *(optional)* |

---

## 🔄 User Flows

### Organiser

```
1.  Register → Login (email / Google / GitHub OAuth)
2.  Create Event
    → Describe in natural language
    → AI extracts: type, team size, stages, scoring criteria, judge count
    → Review & confirm config
3.  Upload Participant CSV
    → Columns: name, email, college, skill
    → Skill normalisation runs automatically
4.  Generate Teams
    → Balanced skill-aware formation (Frontend + Backend + Designer)
    → Falls back to round-robin if needed
    → AI writes rationale for every team
5.  Review Teams (DRAFT state)
    → Read AI rationales
    → Two-click confirmation to publish (safety gate)
6.  Add Judges
    → Enter name + email per judge
    → Assign teams (round-robin or manual)
7.  Send Magic Links
    → JWT-signed email links sent via SendGrid queue
8.  Monitor Evaluations
    → Real-time WebSocket updates on admin dashboard
    → Anomaly flags appear immediately when triggered
9.  Review Anomaly Flags
    → Read AI-generated explanation
    → Accept / Discard / Override each flag
10. Calibration & Normalisation
    → View per-judge bias labels (Harsh / Neutral / Lenient)
    → Read AI-generated judge summaries
    → Toggle Z-score normalisation
    → Compare raw vs. normalised leaderboard side-by-side
11. Publish Results
    → Send AI-drafted results emails to all participants
```

### Judge

```
1.  Receive magic link email
2.  Click link → JWT verified → no password needed
3.  See list of assigned teams
4.  For each team:
    → Score Code Quality (0–10)
    → Score Innovation (0–10)
    → Score Presentation (0–10)
    → Star rating (optional)
    → Comment (min. 20 characters)
    → Submit → auto-advances to next team
5.  If score deviates from panel avg by > threshold:
    → Anomaly flag created automatically
    → Organiser is notified via WebSocket
```

### Participant

```
1.  Navigate to Participant Portal
2.  Enter registered email → receive OTP → verify
3.  View team dashboard:
    → Team name, members, skills, colleges
    → Current stage and status
    → GitHub contribution leaderboard (if repo linked)
4.  Access AI Mentor Chat:
    → Set problem statement first (required)
    → Ask questions → receive Socratic guidance
    → Never gets code — always gets questions back
5.  Receive result notification email when organiser publishes
```

---

## 📡 API Reference

### Node.js Backend — `localhost:5000`

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register organiser (email/password) |
| `POST` | `/auth/login` | Login organiser |
| `GET` | `/auth/google` | Initiate Google OAuth |
| `GET` | `/auth/github` | Initiate GitHub OAuth |

#### Events & Roster
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/events` | List organiser's events |
| `POST` | `/api/admin/events` | Create event |
| `DELETE` | `/api/admin/events/:id` | Delete event and all data |
| `POST` | `/api/admin/upload-roster` | Upload participant CSV |
| `GET` | `/api/admin/participants` | List participants for event |
| `GET` | `/api/admin/participants/by-email/:email` | Lookup participant by email |

#### Teams
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/generate-teams` | AI-assisted team formation |
| `GET` | `/api/admin/teams` | List teams (with members + evaluations) |
| `POST` | `/api/admin/publish-teams` | Publish teams (two-click guarded) |
| `GET` | `/api/admin/leaderboard` | Ranked team leaderboard |
| `GET` | `/api/admin/pending-approvals` | Draft team + pending anomaly counts |

#### Judges
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/judges` | List all judges |
| `POST` | `/api/admin/judges` | Add judge |
| `DELETE` | `/api/admin/judges/:id` | Delete judge |
| `POST` | `/api/admin/send-judge-links` | Generate JWTs + send magic link emails |
| `POST` | `/api/judge/evaluate` | Submit judge evaluation |

#### Calibration
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/calibration/judge-calibration-report` | Per-judge bias analysis + Z-score data |
| `POST` | `/api/admin/calibration/judge-calibration-report/generate-summaries` | Trigger AI summary generation |
| `GET` | `/api/admin/calibration/leaderboard/comparison` | Raw vs. normalised leaderboard diff |
| `POST` | `/api/admin/calibration/settings/zscore-normalisation` | Enable/disable Z-score |
| `POST` | `/api/admin/calibration/settings/anomaly-threshold` | Set anomaly threshold |
| `POST` | `/api/admin/calibration/run-post-normalisation-check` | Re-run anomaly detection post-normalisation |

#### Anomalies
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/anomaly-flags` | List all flags (filter by status) |
| `POST` | `/api/anomalies/:flagId/accept` | Accept flagged score |
| `POST` | `/api/anomalies/:flagId/discard` | Soft-delete score |
| `POST` | `/api/anomalies/:flagId/override` | Set manual override score |

#### GitHub Analyzer
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/github/connect` | Link GitHub repo to event |
| `POST` | `/api/github/analyze/team/:teamId` | Run analysis for a team's repo |
| `GET` | `/api/github/team/:teamId/leaderboard` | Get contribution leaderboard |

#### Mentor & Communication
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mentor/session` | Get team's mentor conversation history |
| `POST` | `/api/mentor/message` | Send message to AI mentor |
| `PUT` | `/api/mentor/context` | Update team problem statement |
| `GET` | `/api/admin/mentor-logs` | Admin view: all mentor conversations |
| `POST` | `/api/admin/send-participant-emails` | Bulk email to participants |

---

### AI Backend — `localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/configure-event` | Conversational event config extraction |
| `POST` | `/generate-rationale` | AI team rationale (GPT-4o-mini) |
| `POST` | `/draft-email` | AI notification email body |
| `POST` | `/draft-results-email` | AI results HTML email |
| `POST` | `/calibration-summary` | Per-judge bias analysis text |
| `POST` | `/explain-anomaly` | Anomaly explanation + accept/discard/override recommendation |
| `POST` | `/generate-rubric` | Judging rubric for a challenge |
| `POST` | `/synthesize-feedback` | Theme extraction from open-text feedback |
| `POST` | `/compatibility-summary` | Team compatibility summary |
| `POST` | `/ai-mentor` | Socratic mentor response (Claude) |
| `POST` | `/ai-assistant` | General event assistant |
| `GET` | `/docs` | Swagger interactive documentation |

---

## ☁️ Deployment

ORCHESTR is deployed on **Render** (free tier):

| Service | URL |
|---|---|
| 🌐 Frontend | https://orchestr-v97d.onrender.com |
| ⚙️ Backend | https://orchestr-backend-8u5k.onrender.com |
| 🤖 AI Backend | https://orchestr-ai.onrender.com |

**Production env vars for frontend:**

```env
# frontend/.env.production
VITE_NODE_URL=https://orchestr-backend-8u5k.onrender.com
VITE_AI_URL=https://orchestr-ai.onrender.com
```

**Build frontend for production:**

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

---

## 🔧 Troubleshooting

| Problem | Diagnosis & Fix |
|---|---|
| **Redis connection refused** | `docker exec hacksync-redis redis-cli ping` → should return `PONG`. If not: `docker start hacksync-redis` |
| **Prisma client error** | `npx prisma generate && npx prisma migrate dev` |
| **Port 5000 in use** | `netstat -ano \| findstr :5000` → `taskkill /PID <PID> /F` |
| **Port 5173 in use** | `netstat -ano \| findstr :5173` → `taskkill /PID <PID> /F` |
| **Docker containers not running** | Open Docker Desktop, wait for startup, then `docker start hacksync-postgres hacksync-redis` |
| **AI backend won't start** | `pip install -r requirements.txt --upgrade` → check `OPENROUTER_API_KEY` is set in `ai-backend/.env` |
| **GitHub Analyzer rate limit** | Add `GITHUB_TOKEN` to `backend/.env` — unauthenticated limit is 60 req/hr |
| **SendGrid emails not sending** | Verify sender email is authenticated in your SendGrid account → check `EmailLog` table for errors |
| **Judge link says "tampered"** | Regenerate judge links — click "Send Links" again in the judge management panel |

---

## 🔁 Quick Restart (After Initial Setup)

```powershell
# 1. Start databases (30 seconds)
docker start hacksync-postgres hacksync-redis

# 2. Start all services in 4 terminals:
cd HackSync_fixed

# T1: API
cd backend && npm run dev

# T2: Email Worker  
cd backend && npm run worker

# T3: AI Backend
cd ai-backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# T4: Frontend
cd frontend && npm run dev
```

---

## 📁 Repo Structure

```
ORCHESTR/
├── README.md                  ← You are here
├── docs/
│   └── images/                ← Drop your screenshots + PPT exports here
│       ├── landing.png
│       ├── dashboard.png
│       ├── architecture.png   ← Export your PPT architecture slide as PNG
│       ├── er-diagram.png     ← Export your PPT ER diagram slide as PNG
│       └── ...
└── HackSync_fixed/
    ├── frontend/              ← React 19 + Vite + Tailwind
    │   └── src/
    │       ├── pages/         ← LandingPage, AdminDashboard, JudgeEvaluate, AIMentor, ...
    │       ├── components/    ← Reusable UI components
    │       └── api.js         ← Centralised API client
    ├── backend/               ← Node.js + Express + Prisma
    │   ├── src/
    │   │   ├── routes/        ← All API route handlers
    │   │   ├── services/      ← githubService.js, otpService.js
    │   │   ├── workers/       ← emailWorker.js (BullMQ)
    │   │   └── queues/        ← emailQueue.js, anomalyQueue.js
    │   └── prisma/
    │       └── schema.prisma  ← Full database schema
    └── ai-backend/            ← Python FastAPI
        └── main.py            ← All AI endpoints
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: describe what you added'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

<div align="center">
<br/>

**Built with ❤️ for every organiser who's ever managed a hackathon in a spreadsheet.**

*ORCHESTR — Conduct your events.*

<br/>

[![Live Demo](https://img.shields.io/badge/Try_It_Live-6366f1?style=for-the-badge)](https://orchestr-v97d.onrender.com)

</div>
