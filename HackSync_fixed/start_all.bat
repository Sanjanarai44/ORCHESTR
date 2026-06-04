@echo off
echo Starting Backend...
start cmd /k "cd backend && npm run dev"

echo Starting Backend Worker...
start cmd /k "cd backend && npm run worker"

echo Starting AI Backend...
start cmd /k "cd ai-backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo All services have been launched in separate windows!
