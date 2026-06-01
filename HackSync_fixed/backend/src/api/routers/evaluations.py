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
from src.core.config import ai_client, JWT_SECRET, JWT_ALGORITHM, FRONTEND_URL, JWT_EXPIRY_HOURS, ANOMALY_DEFAULT_THRESHOLD
from src.core.security import get_judge_from_cookie, build_magic_link, verify_judge_token
from src.core.websocket import ws_manager
from src.schemas.common import *

router = APIRouter()
def call_llm(prompt: str, fallback: str) -> str:
    try:
        response = ai_client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[LLM] Call failed: {e}")
        return fallback


@router.post("/api/evaluations/submit")
async def submit_evaluation(body: EvaluationSubmit, request: Request, judge_session: Optional[str] = Cookie(default=None)):
    judge = get_judge_from_cookie(request, judge_session)
    conn = get_db()

    # Idempotency
    existing = conn.execute(
        "SELECT id FROM evaluations WHERE judge_id = ? AND team_id = ? AND discarded = 0",
        (judge["id"], body.teamId)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(409, "Already submitted for this team.")

    eval_id = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO evaluations
           (id, judge_id, team_id, score_code, score_innovation, score_presentation,
            star_rating, comment, discarded)
           VALUES (?,?,?,?,?,?,?,?,0)""",
        (eval_id, judge["id"], body.teamId, body.scoreCode, body.scoreInnovation,
         body.scorePresentation, body.starRating, body.comment)
    )
    conn.commit()

    # Anomaly detection
    anomaly_data = _run_anomaly_detection(conn, eval_id, judge, body)
    if anomaly_data:
        conn.commit()
        await ws_manager.broadcast("anomaly:new", anomaly_data)

    # Find next unscored team
    assigned = json.loads(judge.get("assigned_teams") or "[]")
    scored_ids = {row["team_id"] for row in conn.execute(
        "SELECT team_id FROM evaluations WHERE judge_id = ? AND discarded = 0", (judge["id"],)
    ).fetchall()}
    next_team_id = next((t for t in assigned if t not in scored_ids and t != body.teamId), None)

    conn.close()

    await ws_manager.broadcast("judge:scored", {
        "judgeId": judge["id"],
        "judgeName": judge["name"],
        "teamId": body.teamId,
    })

    return {"success": True, "evaluationId": eval_id, "nextTeamId": next_team_id}


def _run_anomaly_detection(conn, eval_id: str, judge: dict, body: EvaluationSubmit) -> Optional[dict]:
    """Compare new score to panel average. If deviation > threshold, create flag."""
    prior = conn.execute(
        """SELECT score_code, score_innovation, score_presentation FROM evaluations
           WHERE team_id = ? AND judge_id != ? AND discarded = 0""",
        (body.teamId, judge["id"])
    ).fetchall()

    if len(prior) < 1:
        return None

    prior_avgs = [(r["score_code"] + r["score_innovation"] + r["score_presentation"]) / 3 for r in prior]
    panel_avg = sum(prior_avgs) / len(prior_avgs)
    new_avg = (body.scoreCode + body.scoreInnovation + body.scorePresentation) / 3
    deviation = abs(new_avg - panel_avg)

    threshold_row = conn.execute("SELECT value FROM event_settings WHERE key = 'anomaly_threshold'").fetchone()
    threshold = float(threshold_row["value"]) if threshold_row else ANOMALY_DEFAULT_THRESHOLD

    if deviation <= threshold:
        return None

    flag_id = str(uuid.uuid4())
    team = conn.execute("SELECT name FROM teams WHERE id = ?", (body.teamId,)).fetchone()
    team_name = team["name"] if team else "Unknown"

    conn.execute(
        """INSERT INTO anomaly_flags
           (id, team_id, judge_id, new_score, panel_avg, deviation, llm_explanation, status)
           VALUES (?,?,?,?,?,?,?,'PENDING')""",
        (flag_id, body.teamId, judge["id"], round(new_avg, 2), round(panel_avg, 2),
         round(deviation, 2), "Generating explanation...")
    )
    conn.execute("UPDATE teams SET results_held = 1 WHERE id = ?", (body.teamId,))

    # Trigger async Celery task
    try:
        from workers.celery_tasks import generate_anomaly_explanation
        generate_anomaly_explanation.delay(flag_id)
        print(f"[Celery] Queued anomaly explanation for {flag_id}")
    except Exception as e:
        print(f"[Celery Error] Could not queue task: {e}")

    return {
        "flagId": flag_id,
        "teamId": body.teamId,
        "teamName": team_name,
        "judgeName": judge["name"],
        "newScore": round(new_avg, 2),
        "panelAvg": round(panel_avg, 2),
        "deviation": round(deviation, 2),
        "llmExplanation": "Generating explanation...",
    }


@router.post("/api/anomalies/{flag_id}/accept")
async def accept_anomaly(flag_id: str):
    conn = get_db()
    flag = conn.execute("SELECT * FROM anomaly_flags WHERE id = ?", (flag_id,)).fetchone()
    if not flag:
        conn.close()
        raise HTTPException(404, "Flag not found.")
    if flag["status"] == "RESOLVED":
        conn.close()
        raise HTTPException(409, "Already resolved.")
    conn.execute("UPDATE anomaly_flags SET status='RESOLVED', resolution='accepted' WHERE id=?", (flag_id,))
    conn.execute("UPDATE teams SET results_held=0 WHERE id=?", (flag["team_id"],))
    conn.commit()
    conn.close()
    await ws_manager.broadcast("anomaly:resolved", {"flagId": flag_id, "resolution": "accepted"})
    return {"success": True, "resolution": "accepted"}


@router.post("/api/anomalies/{flag_id}/discard")
async def discard_anomaly(flag_id: str):
    conn = get_db()
    flag = conn.execute("SELECT * FROM anomaly_flags WHERE id = ?", (flag_id,)).fetchone()
    if not flag:
        conn.close()
        raise HTTPException(404, "Flag not found.")
    conn.execute("UPDATE evaluations SET discarded=1 WHERE judge_id=? AND team_id=? AND discarded=0",
                 (flag["judge_id"], flag["team_id"]))
    conn.execute("UPDATE anomaly_flags SET status='RESOLVED', resolution='discarded' WHERE id=?", (flag_id,))
    conn.execute("UPDATE teams SET results_held=0 WHERE id=?", (flag["team_id"],))
    conn.commit()
    conn.close()
    await ws_manager.broadcast("anomaly:resolved", {"flagId": flag_id, "resolution": "discarded"})
    return {"success": True, "resolution": "discarded"}


@router.post("/api/anomalies/{flag_id}/override")
async def override_anomaly(flag_id: str, body: OverrideBody):
    conn = get_db()
    flag = conn.execute("SELECT * FROM anomaly_flags WHERE id = ?", (flag_id,)).fetchone()
    if not flag:
        conn.close()
        raise HTTPException(404, "Flag not found.")
    conn.execute("UPDATE evaluations SET override_score=? WHERE judge_id=? AND team_id=? AND discarded=0",
                 (body.overrideScore, flag["judge_id"], flag["team_id"]))
    conn.execute("UPDATE anomaly_flags SET status='RESOLVED', resolution='overridden' WHERE id=?", (flag_id,))
    conn.execute("UPDATE teams SET results_held=0 WHERE id=?", (flag["team_id"],))
    conn.commit()
    conn.close()
    await ws_manager.broadcast("anomaly:resolved", {"flagId": flag_id, "resolution": "overridden",
                                                     "overrideScore": body.overrideScore})
    return {"success": True, "resolution": "overridden", "overrideScore": body.overrideScore}
