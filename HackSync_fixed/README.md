# Wise@TI Hackathon Platform Setup

## Tech Stack

* Frontend: React + Vite + TailwindCSS
* Backend: Node.js + Express
* Database: PostgreSQL
* ORM: Prisma
* Queue System: Redis + BullMQ
* AI: OpenAI API
* Email Service: SendGrid
* Docker for local infrastructure

---

# Project Structure

```bash
Wise@TI/
│
├── frontend/
├── backend/
├── docker-compose.yml

### 1. Infrastructure Up (Root Directory)

```bash
# Start PostgreSQL & Redis (Port 6380) in the background
docker-compose up -d

# Verify containers (vireon_postgres, vireon_redis) are live
docker ps

```

### 2. Database & Frontend Setup (Frontend Directory)

```bash
# Navigate to frontend and install workspace packages
cd frontend
npm install

# Push structural tables to PostgreSQL and generate client types
npx prisma migrate dev --name init

# Launch visual GUI to view and manage database rows
npx prisma studio

# Start the Next.js local application server (http://localhost:3000)
npm run dev

```

### 3. Backend Setup (Backend Directory)

```bash
# Navigate to backend directory
cd ../backend

# Create python virtual environment
python -m venv venv

# Activate environment (Windows)
.\venv\Scripts\Activate
# Activate environment (Mac/Linux)
source venv/bin/activate

# Install required engine microservice dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv redis

# Spin up the FastAPI dev server (http://127.0.0.1:8000)
uvicorn main:app --reload

```

### 4. Verification Check

* Open `http://localhost:3000/api/test-queue` in your browser.
* Expected output: `{"success": true, "message": "Job added to queue"}` (Confirms Redis and BullMQ connection).
