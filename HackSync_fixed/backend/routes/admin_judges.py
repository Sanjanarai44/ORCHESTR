"""
System 1 Admin Routes — Judge Management
  GET  /api/admin/judges             — List all judges
  POST /api/admin/judges             — Add a judge
  POST /api/admin/send-judge-links   — Generate JWTs + queue magic-link emails
  GET  /api/admin/leaderboard        — Team scores leaderboard
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from helpers.jwt_helpers import build_magic_link, generate_judge_token
from middleware.auth import requireAdminAuth
from models.database import get_db
from models.models import Evaluation, Judge, Team

router = APIRouter(prefix="/api/admin", tags=["Admin Judges"])


class JudgeCreateRequest(BaseModel):
    name: str
    email: EmailStr
    assignedTeams: List[str] = []


# ── GET /api/admin/judges ─────────────────────────────────────────────────────
@router.get("/judges")
async def list_judges(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    result = await db.execute(select(Judge).order_by(Judge.created_at.desc()))
    judges = result.scalars().all()
    return {
        "judges": [
            {
                "id": str(j.id),
                "name": j.name,
                "email": j.email,
                "tokenUsed": j.token_used,
                "assignedTeamsCount": len(j.assigned_teams or []),
                "createdAt": j.created_at.isoformat(),
            }
            for j in judges
        ]
    }


# ── POST /api/admin/judges ────────────────────────────────────────────────────
@router.post("/judges", status_code=status.HTTP_201_CREATED)
async def create_judge(
    body: JudgeCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    # Check duplicate
    existing = await db.execute(select(Judge).where(Judge.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Judge with email {body.email} already exists.",
        )

    assigned = [uuid.UUID(t) for t in body.assignedTeams] if body.assignedTeams else []
    judge = Judge(
        name=body.name,
        email=body.email,
        assigned_teams=assigned,
    )
    db.add(judge)
    await db.commit()
    await db.refresh(judge)
    return {"success": True, "judgeId": str(judge.id)}


# ── POST /api/admin/send-judge-links ──────────────────────────────────────────
@router.post("/send-judge-links")
async def send_judge_links(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """
    For each judge:
      1. Generate a signed JWT
      2. Store in judges.jwt_token
      3. Reset token_used to False (fresh link)
      4. Queue BullMQ email job for magic-link email
    Returns count of links sent.
    """
    result = await db.execute(select(Judge))
    judges = result.scalars().all()

    if not judges:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No judges found. Add judges first.",
        )

    sent_count = 0
    for judge in judges:
        token = generate_judge_token(str(judge.id))
        judge.jwt_token = token
        judge.token_used = False
        magic_link = build_magic_link(token)

        # Queue the magic-link email via Node.js BullMQ
        await _queue_magic_link_email(
            judge_id=str(judge.id),
            judge_email=judge.email,
            judge_name=judge.name,
            magic_link=magic_link,
        )
        sent_count += 1

    await db.commit()
    return {"success": True, "linksSent": sent_count}


async def _queue_magic_link_email(
    judge_id: str,
    judge_email: str,
    judge_name: str,
    magic_link: str,
):
    """
    Pushes a magic-link email job to BullMQ via Redis directly.
    The Node.js emailWorker picks it up.
    In production you'd call the Node.js server; here we use the shared Redis queue.
    """
    import json
    import redis.asyncio as aioredis

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        job_data = {
            "recipientId": judge_id,
            "recipientEmail": judge_email,
            "emailType": "magic_link",
            "templateData": {
                "judgeName": judge_name,
                "magicLink": magic_link,
                "expiryHours": settings.JWT_EXPIRY_HOURS,
                "eventName": "AlgoRythm EventFlow",
            },
        }
        # BullMQ job format — push to email_queue list
        await r.lpush("bull:email_queue:wait", json.dumps({
            "name": "send_email",
            "data": job_data,
            "opts": {"attempts": 3},
        }))
        await r.close()
    except Exception as e:
        print(f"[Warning] Could not queue magic link email for {judge_email}: {e}")


# ── GET /api/admin/leaderboard ────────────────────────────────────────────────
@router.get("/leaderboard")
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """Compute leaderboard from all non-discarded evaluations."""
    teams_result = await db.execute(select(Team))
    teams = teams_result.scalars().all()

    leaderboard = []
    for team in teams:
        evals_result = await db.execute(
            select(Evaluation).where(
                Evaluation.team_id == team.id,
                Evaluation.discarded == False,
            )
        )
        evals = evals_result.scalars().all()

        if not evals:
            avg = None
            judge_count = 0
        else:
            # Use override_score if set, otherwise average the three criteria
            totals = []
            for e in evals:
                if e.override_score is not None:
                    totals.append(e.override_score)
                else:
                    totals.append(
                        (e.score_code + e.score_innovation + e.score_presentation) / 3
                    )
            avg = round(sum(totals) / len(totals), 2) if totals else None
            judge_count = len(evals)

        leaderboard.append({
            "teamId": str(team.id),
            "teamName": team.name,
            "avgScore": avg,
            "judgeCount": judge_count,
            "resultsHeld": team.results_held,
        })

    # Sort by average score descending (None/unscored teams at bottom)
    leaderboard.sort(
        key=lambda x: x["avgScore"] if x["avgScore"] is not None else -1,
        reverse=True,
    )

    for i, row in enumerate(leaderboard):
        row["rank"] = i + 1

    return {"leaderboard": leaderboard}
