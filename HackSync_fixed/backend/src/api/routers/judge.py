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
@router.get("/api/judge/verify")
def verify_judge(token: str, response: Response):
    """Validate JWT magic link → set session cookie."""
    try:
        payload = verify_judge_token(token)
    except JWTError as e:
        err = str(e)
        if "expired" in err.lower():
            raise HTTPException(401, "This link has expired. Contact organizer for a new one.")
        raise HTTPException(401, "This link is invalid. Use the original link from your email.")

    judge_id = payload.get("judgeId")

    conn = get_db()
    row = conn.execute("SELECT * FROM judges WHERE id = ?", (judge_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Judge not found. Use the original link from your email.")
    
    conn.commit()
    conn.close()

    response.set_cookie(
        key="judge_session",
        value=judge_id,
        httponly=True,
        samesite="lax",
        max_age=JWT_EXPIRY_HOURS * 3600,
    )
    return {"success": True, "judgeId": judge_id, "judgeName": row["name"]}


@router.get("/api/judge/me")
def judge_me(request: Request, judge_session: Optional[str] = Cookie(default=None)):
    judge = get_judge_from_cookie(request, judge_session)
    assigned = json.loads(judge.get("assigned_teams") or "[]")
    return {"id": judge["id"], "name": judge["name"], "email": judge["email"],
            "assignedTeamsCount": len(assigned)}


@router.get("/api/judge/teams")
def judge_teams(request: Request, judge_session: Optional[str] = Cookie(default=None)):
    judge = get_judge_from_cookie(request, judge_session)
    assigned = json.loads(judge.get("assigned_teams") or "[]")
    conn = get_db()
    teams_data = []
    for team_id in assigned:
        team = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
        if not team:
            continue
        members = conn.execute("SELECT * FROM team_members WHERE team_id = ?", (team_id,)).fetchall()
        evaluation = conn.execute(
            "SELECT * FROM evaluations WHERE judge_id = ? AND team_id = ? AND discarded = 0",
            (judge["id"], team_id)
        ).fetchone()
        teams_data.append({
            "id": team["id"],
            "name": team["name"],
            "problemStatement": team["problem_statement"] or "",
            "evaluationGuide": team["evaluation_guide"] or "",
            "resultsHeld": bool(team["results_held"]),
            "members": [{"name": m["name"], "skill": m["skill"], "college": m["college"],
                         "email": m["email"]} for m in members],
            "scored": evaluation is not None,
            "submittedScores": ({
                "code": evaluation["score_code"],
                "innovation": evaluation["score_innovation"],
                "presentation": evaluation["score_presentation"],
                "starRating": evaluation["star_rating"],
                "comment": evaluation["comment"],
                "submittedAt": evaluation["submitted_at"],
            } if evaluation else None),
        })
    conn.close()
    return {"teams": teams_data}
