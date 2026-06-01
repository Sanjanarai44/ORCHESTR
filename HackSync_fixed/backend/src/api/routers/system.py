from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, UploadFile, File, WebSocket, WebSocketDisconnect
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import json
import csv
import io
import math
import sqlite3
from jose import jwt, JWTError
from src.core.database import get_db
from src.core.config import JWT_SECRET, JWT_ALGORITHM, FRONTEND_URL, JWT_EXPIRY_HOURS
from src.core.security import get_judge_from_cookie, build_magic_link, verify_judge_token
from src.core.websocket import ws_manager
from src.schemas.common import *

router = APIRouter()
@router.on_event("startup")
def startup():
    init_db()


def generate_judge_token(judge_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    return jwt.encode(
        {"sub": judge_id, "judgeId": judge_id, "type": "judge_magic_link", "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.get("/health")
def health():
    return {"status": "ok", "service": "judge-mentor-api"}
