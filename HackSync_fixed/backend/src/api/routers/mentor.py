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
MENTOR_SYSTEM = '''You are an AI mentor for a hackathon. Your ONLY job is to help teams think more clearly by acting as an explanatory Socratic guide.

STRICT RULES:
- CONTEXT AWARENESS: You must ONLY reply to questions related to their specific problem statement. Refuse to answer ANY out-of-context or off-topic questions.
- EXPLANATORY SOCRATIC MODE: You ARE allowed to explain concepts, algorithms, and theory clearly to help them understand. However, you MUST NEVER give direct answers. You MUST ALWAYS end your response with a guiding question to provoke their own critical thinking.
- NO DIRECT CODE: You MUST NEVER write any code or provide direct solutions. If they ask for code, explain the concept conceptually and ask them how they might implement it.

The user is working on: {problem_statement}.
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

    # Guard clause: Require problem description before interacting
    problem_statement = team["problem_statement"]
    if not problem_statement or not problem_statement.strip() or problem_statement.lower() == "none":
        reply = "I cannot provide guidance without knowing your project's problem description. Please provide a problem description or explain the specific problem you are trying to solve in your team context first."
        
        now = datetime.utcnow().isoformat()
        # Save user message
        conn.execute(
            "INSERT INTO mentor_conversations (id, team_id, role, content, timestamp) VALUES (?,?,'user',?,?)",
            (str(uuid.uuid4()), teamId, body.message, now)
        )
        # Save assistant reply
        reply_ts = datetime.utcnow().isoformat()
        conn.execute(
            "INSERT INTO mentor_conversations (id, team_id, role, content, timestamp) VALUES (?,?,'assistant',?,?)",
            (str(uuid.uuid4()), teamId, reply, reply_ts)
        )
        conn.commit()
        conn.close()
        return {"reply": reply, "timestamp": reply_ts}

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
