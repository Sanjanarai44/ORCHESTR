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
from src.core.config import ai_client, JWT_SECRET, JWT_ALGORITHM, FRONTEND_URL, JWT_EXPIRY_HOURS
from src.core.security import get_judge_from_cookie, build_magic_link, verify_judge_token
from src.core.websocket import ws_manager
from src.schemas.common import *

router = APIRouter()
MENTOR_SYSTEM = '''You are an AI mentor for a hackathon. Your ONLY job is to help teams think more clearly by asking Socratic questions.

STRICT RULES:
- You MUST NEVER write any code.
- You MUST NEVER give direct solutions or complete tasks.
- Every response must be a question (must end with ?).

The user is working on {problem_statement}.
'''
FALLBACK_Q = 'What aspect of your problem feels most unclear right now?'
@router.get("/api/mentor/session")
def mentor_session(teamId: str):
    conn = get_db()
    team = conn.execute("SELECT * FROM teams WHERE id=?", (teamId,)).fetchone()
    if not team:
        # Auto-create team for demo purposes
        conn.execute("INSERT OR IGNORE INTO teams (id, name) VALUES (?,?)", (teamId, f"Team {teamId[:8]}"))
        conn.commit()
        team = conn.execute("SELECT * FROM teams WHERE id=?", (teamId,)).fetchone()
    msgs = conn.execute(
        "SELECT * FROM mentor_conversations WHERE team_id=? ORDER BY timestamp ASC",
        (teamId,)
    ).fetchall()
    conn.close()
    return {
        "teamName": team["name"],
        "problemStatement": team["problem_statement"] or "",
        "messages": [{"role": m["role"], "content": m["content"], "timestamp": m["timestamp"]} for m in msgs],
    }


@router.post("/api/mentor/message")
def mentor_message(body: MentorMessage, teamId: str):
    conn = get_db()
    team = conn.execute("SELECT * FROM teams WHERE id=?", (teamId,)).fetchone()
    if not team:
        conn.execute("INSERT OR IGNORE INTO teams (id, name) VALUES (?,?)", (teamId, f"Team {teamId[:8]}"))
        conn.commit()
        team = conn.execute("SELECT * FROM teams WHERE id=?", (teamId,)).fetchone()

    # Save user message
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO mentor_conversations (id, team_id, role, content, timestamp) VALUES (?,?,'user',?,?)",
        (msg_id, teamId, body.message, now)
    )
    conn.commit()

    # Build conversation history (last 20 messages)
    history = conn.execute(
        "SELECT role, content FROM mentor_conversations WHERE team_id=? ORDER BY timestamp ASC LIMIT 20",
        (teamId,)
    ).fetchall()

    system_prompt = MENTOR_SYSTEM.format(
        problem_statement=team["problem_statement"] or "an innovative technical solution"
    )

    messages_for_llm = [{"role": "system", "content": system_prompt}]
    messages_for_llm += [{"role": r["role"], "content": r["content"]} for r in history]

    # Validate reply is a question
    reply = FALLBACK_Q
    for attempt in range(3):
        try:
            if attempt > 0:
                messages_for_llm.append({
                    "role": "user",
                    "content": "Remember: only respond with a Socratic question. No code, no direct answers."
                })
            response = ai_client.chat.completions.create(
                model="openai/gpt-4o-mini",
                max_tokens=200,
                messages=messages_for_llm
            )
            candidate = response.choices[0].message.content.strip()
            if "?" in candidate and "```" not in candidate:
                reply = candidate
                break
        except Exception as e:
            print(f"[Mentor] LLM attempt {attempt+1} failed: {e}")

    # Save assistant reply
    reply_id = str(uuid.uuid4())
    reply_ts = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO mentor_conversations (id, team_id, role, content, timestamp) VALUES (?,?,'assistant',?,?)",
        (reply_id, teamId, reply, reply_ts)
    )
    conn.commit()
    conn.close()
    return {"reply": reply, "timestamp": reply_ts}


@router.put("/api/mentor/context")
def update_context(body: ContextUpdate, teamId: str):
    conn = get_db()
    conn.execute("UPDATE teams SET problem_statement=? WHERE id=?", (body.problemStatement, teamId))
    conn.commit()
    conn.close()
    return {"success": True, "problemStatement": body.problemStatement}
