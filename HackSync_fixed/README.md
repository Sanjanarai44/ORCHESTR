<div align="center">

<h1>⚡ ORCHESTR</h1>
<p><strong>The all-in-one AI-powered hackathon operations platform.</strong></p>
<p>Manage participants, auto-form teams, run judge evaluations, detect scoring anomalies, and mentor teams — all in one place.</p>

<br/>

[![Live Frontend](https://img.shields.io/badge/🌐%20Frontend-Live-success?style=for-the-badge)](https://orchestr-v97d.onrender.com)
[![Backend API](https://img.shields.io/badge/⚙️%20Backend%20API-Live-blue?style=for-the-badge)](https://orchestr-backend-8u5k.onrender.com)
[![AI Server](https://img.shields.io/badge/🤖%20AI%20Server-Live-purple?style=for-the-badge)](https://orchestr-ai.onrender.com)

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.10+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)

</div>

---

## 📖 Table of Contents

1. [What is ORCHESTR?](#-what-is-orchestr)
2. [Key Features](#-key-features)
3. [Architecture](#-architecture)
4. [Tech Stack](#-tech-stack)
5. [Screenshots](#-screenshots)
6. [Prerequisites](#-prerequisites)
7. [Installation & Setup](#-installation--setup)
   - [Clone the Repository](#1-clone-the-repository)
   - [Create Environment Files](#2-create-environment-files)
   - [Start Docker Services](#3-start-docker-services)
   - [Install Dependencies](#4-install-dependencies)
   - [Database Setup](#5-database-setup)
   - [Run the Project](#6-run-the-project)
8. [User Flows](#-user-flows)
9. [API Reference](#-api-reference)
10. [Database Schema](#-database-schema)
11. [Deployment](#-deployment)
12. [Troubleshooting](#-troubleshooting)
13. [Contributing](#-contributing)

---

## 🎯 What is ORCHESTR?

ORCHESTR is a full-stack, AI-augmented **event operations platform** built for hackathon organizers, judges, and participants. It replaces messy spreadsheets and manual coordination with an intelligent, automated pipeline.

From the moment participants register to the announcement of final results, ORCHESTR handles it all:

- 📋 **CSV-based roster ingestion** → automatic smart team formation
- 🤖 **GPT-4o-powered AI** → generates team rationales, drafts emails, detects scoring anomalies
- ⚖️ **Judge portal** with magic-link authentication and round-robin team assignment
- 📡 **Real-time leaderboard** with calibrated scoring
- 🧠 **Socratic AI Mentor** for participants — guides without giving away answers
- 📬 **Automated email pipeline** via SendGrid + BullMQ job queues

---

## ✨ Key Features

### For Organizers
| Feature | Description |
|---|---|
| 🏆 **AI Event Setup** | Describe your event in plain English; AI extracts config (team size, stages, judges, criteria) |
| 📂 **CSV Upload & Team Generation** | Upload participant roster → one-click balanced team formation (skill-aware + fallback round-robin) |
| 🤖 **AI Team Rationale** | GPT-4o writes a rationale for every team explaining why they work well together |
| 📬 **Automated Emails** | AI-drafted welcome, team assignment, and results emails sent via SendGrid queue |
| 📊 **Analytics Dashboard** | Judge calibration stats, scoring bias detection, feedback synthesis |
| 🏅 **Live Leaderboard** | Real-time ranked teams based on weighted judge scores |
| 🔍 **Anomaly Review Panel** | Flag and investigate outlier judge scores with AI-generated explanations |

### For Judges
| Feature | Description |
|---|---|
| 🔗 **Magic Link Auth** | One-click JWT-secured judge portal — no password needed |
| 📝 **Structured Evaluation** | Score teams on Code Quality, Innovation, and Presentation (0–10 each) |
| ⭐ **Star Rating** | Quick qualitative rating alongside detailed scores |
| 🚨 **Anomaly Detection** | Real-time flagging if a score deviates significantly from panel average |

### For Participants
| Feature | Description |
|---|---|
| 📧 **Email-based Access** | Enter your registered email — instant access to your team dashboard |
| 👥 **Team View** | See your assigned team members, their skills, and college |
| 🧠 **AI Mentor Chat** | Socratic mentor that guides your thinking without writing code for you |
| 🔒 **Problem Statement Lock** | AI mentor only activates after the team sets a clear problem statement |
| 📣 **Result Notifications** | Automatically notified when results are published |

---

## 🏛 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTR Platform                     │
│                                                         │
│  ┌──────────────┐    REST     ┌──────────────────────┐  │
│  │   React 19   │◄──────────►│   Node.js / Express  │  │
│  │  (Vite +     │            │   (Port 5000)         │  │
│  │  Tailwind)   │    REST     │                      │  │
│  │  Port 5173   │◄──────────►│  ┌────────────────┐  │  │
│  └──────────────┘            │  │  Prisma ORM    │  │  │
│                              │  └───────┬────────┘  │  │
│  ┌──────────────┐            │          │            │  │
│  │  FastAPI /   │◄──────────►│  ┌───────▼────────┐  │  │
│  │  Python 3.10 │  Proxy     │  │  PostgreSQL 15  │  │  │
│  │  (Port 8000) │            │  └────────────────┘  │  │
│  │              │            │                      │  │
│  │  GPT-4o-mini │            │  ┌────────────────┐  │  │
│  │  (OpenRouter)│            │  │   Redis +      │  │  │
│  └──────────────┘            │  │   BullMQ Queue │  │  │
│                              │  └────────────────┘  │  │
│                              └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Services at a Glance:**

| Service | Port | Role |
|---|---|---|
| React Frontend | `5173` | SPA — All UI for Organizer, Judge, and Participant portals |
| Node.js Backend | `5000` | REST API, Auth (JWT + OAuth), DB layer, Email queue |
| FastAPI AI Backend | `8000` | All LLM/AI calls (GPT-4o-mini via OpenRouter) |
| PostgreSQL | `5432` | Primary database (all event data) |
| Redis | `6380` | BullMQ job queue for async email delivery |

---

## 🛠 Tech Stack

### Frontend
- **React 19** with **Vite 8**
- **Tailwind CSS 3** for styling
- **React Router v7** for navigation
- **Lucide React** icons
- **Axios** for HTTP

### Backend (Node.js)
- **Express 5** REST API
- **Prisma 5** ORM → PostgreSQL
- **BullMQ** (Redis-backed) async job queue
- **JWT** + **bcryptjs** for auth
- **Passport.js** — Google OAuth 2.0 & GitHub OAuth
- **SendGrid** transactional email
- **Multer** for CSV file uploads
- **csv-parser** for roster ingestion

### AI Backend (Python)
- **FastAPI** with Uvicorn ASGI
- **OpenAI SDK** → **OpenRouter** (GPT-4o-mini)
- **SQLite** (local mentor history cache)
- **httpx** async proxy to Node backend

### Infrastructure
- **PostgreSQL 15** (Docker)
- **Redis 7 Alpine** (Docker)
- **Docker & Docker Compose**
- **Render** (cloud deployment)

---

## 📸 Screenshots

### Admin Dashboard

> Organizer view: team management, judge assignment, and event analytics

### Judge Evaluation Portal

> Magic-link authenticated judge scoring with real-time anomaly detection

### AI Mentor Chat

> Socratic mentor that guides participants without writing code for them

---

## ⚙️ Prerequisites

Make sure you have the following installed:

| Tool | Version | Link |
|---|---|---|
| **Node.js** | `>= 18` | [nodejs.org](https://nodejs.org/) |
| **Python** | `>= 3.10` | [python.org](https://python.org/) |
| **Docker Desktop** | Latest | [docker.com](https://docker.com/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

You'll also need API keys for:
- **OpenRouter** — for GPT-4o-mini calls → [openrouter.ai](https://openrouter.ai/)
- **SendGrid** — for transactional emails → [sendgrid.com](https://sendgrid.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sanjanarai44/ORCHESTR.git
cd ORCHESTR/HackSync_fixed
```

---

### 2. Create Environment Files

#### `backend/.env`

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/hackathon_db

# Server
PORT=5000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173

# AI (OpenRouter - get key at openrouter.ai)
OPENROUTER_API_KEY=<YOUR_OPENROUTER_KEY>

# Email (SendGrid - get key at sendgrid.com)
SENDGRID_API_KEY=<YOUR_SENDGRID_KEY>
SENDGRID_FROM_EMAIL=<YOUR_VERIFIED_SENDER_EMAIL>
COMMITTEE_EMAIL=<COMMITTEE_EMAIL_FOR_NOTIFICATIONS>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6380

# Auth
JWT_SECRET=<GENERATE_A_LONG_RANDOM_SECRET>
SESSION_SECRET=<GENERATE_A_LONG_RANDOM_SECRET>
JWT_EXPIRY_HOURS=48
```

> 💡 Generate secure secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

#### `frontend/.env`

```env
# For local development, point to local services
VITE_NODE_URL=http://localhost:5000
VITE_AI_URL=http://localhost:8000
```

#### `ai-backend/.env`

```env
OPENROUTER_API_KEY=<YOUR_OPENROUTER_KEY>
NODE_URL=http://localhost:5000
```

---

### 3. Start Docker Services

Start PostgreSQL and Redis using Docker:

```powershell
# PostgreSQL (Primary Database)
docker run -d `
  --name hacksync-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=hackathon_db `
  -p 5432:5432 `
  postgres:15

# Redis (Job Queue)
docker run -d `
  --name hacksync-redis `
  -p 6380:6379 `
  redis:7-alpine
```

Alternatively, use Docker Compose (starts both):

```bash
docker compose up -d
```

**Verify containers are running:**

```powershell
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE           COMMAND                  STATUS
xxxxxxxxxxxx   postgres:15     "docker-entrypoint.s…"   Up
xxxxxxxxxxxx   redis:7-alpine  "docker-entrypoint.s…"   Up
```

---

### 4. Install Dependencies

Open a terminal in the `HackSync_fixed` directory and run:

```powershell
# Backend (Node.js)
cd backend
npm install

# Frontend (React + Vite)
cd ../frontend
npm install

# AI Backend (Python)
cd ../ai-backend
pip install -r requirements.txt
```

---

### 5. Database Setup

```powershell
cd backend

# Generate Prisma client types
npx prisma generate

# Run all migrations (creates tables)
npx prisma migrate dev --name init
```

**Optional — Open Prisma Studio (database GUI):**

```powershell
npx prisma studio
# Opens at http://localhost:5555
```

---

### 6. Run the Project

You need **4 separate terminals**, all starting from `HackSync_fixed/`:

#### Terminal 1 — Node.js API Server

```powershell
cd backend
npm run dev
```

✅ Expected:
```
Server running on port 5000
Database connected
```

#### Terminal 2 — Email Worker (BullMQ)

```powershell
cd backend
npm run worker
```

✅ Expected:
```
Email Worker Started
Listening for jobs on: email-queue
```

#### Terminal 3 — AI Backend (FastAPI)

```powershell
cd ai-backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Expected:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

#### Terminal 4 — React Frontend (Vite)

```powershell
cd frontend
npm run dev
```

✅ Expected:
```
  VITE v8.x.x  ready in 400ms
  ➜  Local:   http://localhost:5173/
```

---

### ✅ You're ready! Open the app:

| Service | URL |
|---|---|
| 🌐 **Frontend** | http://localhost:5173 |
| ⚙️ **Backend API** | http://localhost:5000 |
| 🤖 **AI Backend** | http://localhost:8000 |
| 🔬 **Prisma Studio** | http://localhost:5555 *(optional)* |
| 📚 **AI Docs (Swagger)** | http://localhost:8000/docs |

---

## 🔄 User Flows

### Organizer Flow

```
1.  Register / Login (email or Google OAuth)
     ↓
2.  Create New Event
     → Describe event in natural language
     → AI extracts: event type, team size, stages, scoring criteria
     ↓
3.  Upload Participant CSV
     → Columns: name, email, college, skill
     ↓
4.  Generate Teams
     → AI forms balanced teams (skill-aware)
     → Reviews AI-generated rationale per team
     ↓
5.  Publish Teams
     → Requires two-click confirmation (safety gate)
     → Participants receive automated welcome emails
     ↓
6.  Add Judges
     → Enter judge emails + assign teams
     → Click "Send Magic Links" → judges receive JWT-signed links
     ↓
7.  Judges Evaluate
     → Score Code, Innovation, Presentation (0-10)
     → Anomalies auto-flagged if deviation > threshold
     ↓
8.  Review Anomaly Flags
     → Accept / Override / Discard outlier scores with AI rationale
     ↓
9.  Publish Results
     → View ranked leaderboard
     → AI drafts results emails → send to all participants
```

### Judge Flow

```
1.  Receive magic link email: ?token=<JWT>
     ↓
2.  Click link → auto-verified (no password)
     ↓
3.  See assigned teams list
     ↓
4.  Evaluate each team:
     → Code Quality (0-10)
     → Innovation (0-10)
     → Presentation (0-10)
     → Star rating + comment
     ↓
5.  Submit → real-time anomaly check
     → If score deviates > 2pts from panel avg → flagged for review
```

### Participant Flow

```
1.  Navigate to Participant Portal
     ↓
2.  Enter registered email → OTP verification
     ↓
3.  View team dashboard:
     → Team name, members, skills, college
     → Current stage/status
     ↓
4.  Access AI Mentor Chat:
     → Set problem statement first (required)
     → Chat with Socratic mentor (guides, never solves)
     ↓
5.  Receive result notifications via email
```

---

## 📡 API Reference

### Node.js Backend (Port 5000)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register organizer |
| `POST` | `/auth/login` | Login organizer |
| `GET` | `/api/admin/events` | List organizer's events |
| `POST` | `/api/admin/events` | Create event |
| `POST` | `/api/admin/upload-csv` | Upload participant roster |
| `POST` | `/api/admin/generate-teams` | Auto-generate teams |
| `GET` | `/api/admin/teams` | List teams |
| `POST` | `/api/admin/publish-teams` | Publish teams to participants |
| `GET` | `/api/admin/judges` | List judges |
| `POST` | `/api/admin/judges` | Add judge |
| `POST` | `/api/admin/send-judge-links` | Send magic links to judges |
| `GET` | `/api/admin/leaderboard` | Get ranked leaderboard |
| `GET` | `/api/admin/anomaly-flags` | List anomaly flags |
| `POST` | `/api/judge/evaluate` | Submit judge evaluation |
| `GET` | `/api/admin/participants/by-email/:email` | Lookup participant |

### AI Backend (Port 8000)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate-rationale` | Generate AI team rationale |
| `POST` | `/configure-event` | Conversational event config extraction |
| `POST` | `/draft-email` | AI-draft notification email |
| `POST` | `/draft-results-email` | AI-draft results HTML email |
| `POST` | `/calibration-summary` | Judge bias/calibration analysis |
| `POST` | `/explain-anomaly` | Explain scoring anomaly + recommend action |
| `POST` | `/generate-rubric` | Generate judging rubric for a challenge |
| `POST` | `/synthesize-feedback` | Summarize open-text participant feedback |
| `POST` | `/ai-mentor` | Socratic AI mentor response |
| `POST` | `/ai-assistant` | General event assistant chat |
| `GET` | `/docs` | Interactive Swagger UI |

---

## 🗃 Database Schema

```
Event
 ├── Participant[]  (roster, skill, stage, team assignment)
 ├── Team[]
 │    ├── TeamMember[]
 │    ├── Evaluation[]   (judge scores)
 │    ├── AnomalyFlag[]  (outlier score flags)
 │    ├── MentorConversation[]
 │    └── GithubRepo?
 ├── Judge[]
 ├── GithubRepo[]
 └── Feedback[]

EmailLog         (async delivery tracking)
AiEmailContent   (AI-drafted email cache)
OtpCode          (participant OTP verification)
Organizer        (accounts + OAuth)
EventSettings    (per-event KV config)
```

---

## ☁️ Deployment

The app is deployed on **Render**:

| Service | URL |
|---|---|
| Frontend | https://orchestr-v97d.onrender.com |
| Backend | https://orchestr-backend-8u5k.onrender.com |
| AI Backend | https://orchestr-ai.onrender.com |

For production, update your environment files:

**`frontend/.env.production`**
```env
VITE_NODE_URL=https://orchestr-backend-8u5k.onrender.com
VITE_AI_URL=https://orchestr-ai.onrender.com
```

Build the frontend for production:
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

---

## 🔧 Troubleshooting

### Redis Connection Error

```powershell
# Test Redis is responding
docker exec hacksync-redis redis-cli ping
# Expected: PONG

# If container stopped, restart it
docker start hacksync-redis
```

### PostgreSQL Connection Error

```powershell
# Test Postgres is running
docker exec hacksync-postgres pg_isready -U postgres
# Expected: /var/run/postgresql:5432 - accepting connections

# Restart if stopped
docker start hacksync-postgres
```

### Prisma Client Error / Schema Out of Sync

```powershell
cd backend
npx prisma generate       # Regenerate client
npx prisma migrate dev    # Re-run migrations
```

### Port Already in Use

```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace <PID> with actual PID)
taskkill /PID <PID> /F
```

### AI Backend Won't Start (Python Dependencies)

```powershell
cd ai-backend
pip install -r requirements.txt --upgrade
uvicorn main:app --reload
```

### Docker Not Running

Open **Docker Desktop** and wait for it to fully start, then:

```powershell
docker start hacksync-postgres hacksync-redis
docker ps   # Verify both are listed as "Up"
```

---

## 🔁 Returning to the Project Later

After the initial setup, you only need to:

```powershell
# Step 1: Start Docker containers
docker start hacksync-postgres hacksync-redis

# Step 2: Open 4 terminals and run:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd backend && npm run worker

# Terminal 3:
cd ai-backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 4:
cd frontend && npm run dev
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

<div align="center">

Built with ❤️ for hackathon organizers everywhere.

**ORCHESTR** — Making event operations effortless.

</div>
