"""
Routes package — exports all routers for import in main.py.
"""
from routes.judge import router as judge_router
from routes.evaluations import router as evaluations_router
from routes.anomalies import router as anomalies_router
from routes.admin_settings import (
    router as anomalies_admin_router,
)
from routes.admin_judges import router as admin_judges_router
from routes.admin_emails import router as admin_emails_router
from routes.websocket import router as websocket_router
from routes.mentor import router as mentor_router

__all__ = [
    "judge_router",
    "evaluations_router",
    "anomalies_router",
    "anomalies_admin_router",
    "admin_judges_router",
    "admin_emails_router",
    "websocket_router",
    "mentor_router",
]
