
# 1. Project Overview

What ORCHESTR does.

# 2. Tech Stack

Frontend, Backend, AI Backend, PostgreSQL, Redis.

# 3. Prerequisites

```bash
Node.js >= 18
Python >= 3.10
Docker Desktop
Git
```

---

# 4. Clone Repository

```bash
git clone https://github.com/Sanjanarai44/ORCHESTR.git
cd ORCHESTR/HackSync_fixed
```

---

# 5. Create Environment Files

### frontend/.env

```env
VITE_NODE_URL=https://orchestr-backend-8u5k.onrender.com
VITE_AI_URL=https://orchestr-ai.onrender.com
```

### backend/.env

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hackathon_db

PORT=5000

OPENROUTER_API_KEY=<YOUR_KEY>
SENDGRID_API_KEY=<YOUR_KEY>
SENDGRID_FROM_EMAIL=<YOUR_EMAIL>

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6380

JWT_SECRET=<YOUR_SECRET>
SESSION_SECRET=<YOUR_SECRET>

JWT_EXPIRY_HOURS=48

ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173

COMMITTEE_EMAIL=<EMAIL>
```

---

# 6. Start Docker

### PostgreSQL

```powershell
docker run -d `
--name hacksync-postgres `
-e POSTGRES_USER=postgres `
-e POSTGRES_PASSWORD=password `
-e POSTGRES_DB=hackathon_db `
-p 5432:5432 `
postgres:15
```

### Redis

```powershell
docker run -d `
--name hacksync-redis `
-p 6380:6379 `
redis:7-alpine
```

Verify:

```powershell
docker ps
```

---

# 7. Install Dependencies

### Backend

```powershell
cd backend
npm install
```

### Frontend

```powershell
cd ../frontend
npm install
```

### AI Backend

```powershell
cd ../ai-backend
pip install -r requirements.txt
```

---

# 8. Setup Database

```powershell
cd backend

npx prisma generate

npx prisma migrate dev --name init
```

Optional:

```powershell
npx prisma studio
```

---

# 9. Run the Project

Open 4 terminals.

## Terminal 1

```powershell
cd backend

npm run dev
```

Expected:

```text
Server running on port 5000
```

---

## Terminal 2

```powershell
cd backend

npm run worker
```

Expected:

```text
Email Worker Started
```

---

## Terminal 3

```powershell
cd ai-backend

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Expected:

```text
Running on http://localhost:8000
```

---

## Terminal 4

```powershell
cd frontend

npm run dev
```

Expected:

```text
http://localhost:5173
```

---

# 10. Open Application

```text
Frontend  : http://localhost:5173
Backend   : http://localhost:5000
AI Server : http://localhost:8000
```

---

# 11. Demo Flow

```text
1. Login as Organizer

2. Create Event

3. Upload CSV

4. Generate Teams

5. Review AI Rationales

6. Publish Teams

7. Add Judges

8. Send Magic Links

9. Judges Evaluate

10. View Leaderboard
```

---

# 12. Returning Later

Only start Docker:

```powershell
docker start hacksync-postgres hacksync-redis
```

Then run:

```powershell
Terminal 1 → npm run dev
Terminal 2 → npm run worker
Terminal 3 → uvicorn main:app --reload
Terminal 4 → npm run dev
```

---

# 13. Deployment URLs

* Frontend: `https://orchestr-v97d.onrender.com`
* Backend: `https://orchestr-backend-8u5k.onrender.com`
* AI Backend: `https://orchestr-ai.onrender.com`

---

# 14. Troubleshooting

### Redis Error

```powershell
docker exec hacksync-redis redis-cli ping
```

Should return:

```text
PONG
```

### Prisma Error

```powershell
npx prisma generate
npx prisma migrate dev
```

### Port Occupied

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Docker Not Running

```powershell
docker start hacksync-postgres hacksync-redis

