from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import FRONTEND_URL
from src.core.database import init_db

from src.api.routers import admin, judge, evaluations, mentor, ws

app = FastAPI(title="EventOps Judge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

app.include_router(admin.router)
app.include_router(judge.router)
app.include_router(evaluations.router)
app.include_router(mentor.router)
app.include_router(ws.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001, reload=True)
