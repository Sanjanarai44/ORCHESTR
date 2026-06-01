"""
System 1 + System 2 Judge Routes
  GET  /api/judge/verify?token=xxx   — Validate magic link JWT, set session cookie
  GET  /api/judge/teams              — Get assigned teams for this judge
  GET  /api/judge/me                 — Return current judge identity
"""
import uuid
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Request, Response, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from helpers.jwt_helpers import token_hash, verify_judge_token
from middleware.auth import requireJudgeAuth
from models.database import get_db
from models.models import AnomalyFlag, Evaluation, Judge, Team, TeamMember

router = APIRouter(prefix="/api/judge", tags=["Judge"])

# ── Redis client ──────────────────────────────────────────────────────────────
_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


# ── GET /api/judge/verify ─────────────────────────────────────────────────────
@router.get("/verify")
async def verify_judge_token_endpoint(
    token: str = Query(..., description="JWT magic-link token"),
    response: Response = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Validates the judge's single-use JWT magic link.

    Steps:
      1. Verify JWT signature & expiry
      2. Check Redis for replay (used_token:<hash>)
      3. Check DB for token_used flag
      4. Mark token as used in both Redis and DB
      5. Set httpOnly session cookie with judgeId
    """
    # Step 1: Verify JWT
    try:
        payload = verify_judge_token(token)
    except JWTError as e:
        err = str(e)
        if "expired" in err.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This link has expired. Contact organizer for a new link.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This link is invalid or tampered with. Use the original link from your email.",
        )

    judge_id = payload.get("judgeId")
    if not judge_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This link is invalid or tampered with.",
        )

    # Step 2: Redis replay check
    redis_client = await get_redis()
    t_hash = token_hash(token)
    redis_key = f"used_token:{t_hash}"

    already_used_redis = await redis_client.get(redis_key)
    if already_used_redis:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This link has already been used. Each link is single-use. Contact organizer.",
        )

    # Step 3: DB check
    result = await db.execute(select(Judge).where(Judge.id == uuid.UUID(judge_id)))
    judge = result.scalar_one_or_none()

    if not judge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge not found. Use the original link from your email.",
        )

    if judge.token_used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This link has already been used. Each link is single-use. Contact organizer.",
        )

    # Step 4: Mark as used
    judge.token_used = True
    await db.commit()

    ttl_seconds = settings.JWT_EXPIRY_HOURS * 3600
    await redis_client.setex(redis_key, ttl_seconds, "true")

    # Step 5: Set session cookie
    response.set_cookie(
        key="judge_session",
        value=str(judge.id),
        httponly=True,
        samesite="lax",
        max_age=ttl_seconds,
        secure=settings.ENVIRONMENT == "production",
    )

    return {
        "success": True,
        "judgeId": str(judge.id),
        "judgeName": judge.name,
        "message": "Verification successful. Redirecting to evaluation portal.",
    }


# ── GET /api/judge/teams ──────────────────────────────────────────────────────
@router.get("/teams")
async def get_judge_teams(
    judge: Judge = Depends(requireJudgeAuth),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all teams assigned to the authenticated judge, with:
    - Team name, members (name + skill + college), problem statement, evaluation guide
    - Whether this judge has already submitted scores (scored: bool)
    - The submitted scores if already scored (read-only view)
    """
    if not judge.assigned_teams:
        return {"teams": []}

    teams_data = []

    for team_id in judge.assigned_teams:
        # Fetch team
        team_result = await db.execute(
            select(Team).where(Team.id == team_id)
        )
        team = team_result.scalar_one_or_none()
        if not team:
            continue

        # Fetch members
        members_result = await db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id)
        )
        members = members_result.scalars().all()

        # Check if judge already scored this team
        eval_result = await db.execute(
            select(Evaluation).where(
                Evaluation.judge_id == judge.id,
                Evaluation.team_id == team_id,
                Evaluation.discarded == False,
            )
        )
        evaluation = eval_result.scalar_one_or_none()

        teams_data.append({
            "id": str(team.id),
            "name": team.name,
            "problemStatement": team.problem_statement or "",
            "evaluationGuide": team.evaluation_guide or "",
            "members": [
                {
                    "name": m.name,
                    "skill": m.skill,
                    "college": m.college,
                    "email": m.email,
                }
                for m in members
            ],
            "scored": evaluation is not None,
            "resultsHeld": team.results_held,
            "submittedScores": (
                {
                    "code": evaluation.score_code,
                    "innovation": evaluation.score_innovation,
                    "presentation": evaluation.score_presentation,
                    "starRating": evaluation.star_rating,
                    "comment": evaluation.comment,
                    "submittedAt": evaluation.submitted_at.isoformat(),
                }
                if evaluation
                else None
            ),
        })

    return {"teams": teams_data}


# ── GET /api/judge/me ─────────────────────────────────────────────────────────
@router.get("/me")
async def get_judge_me(judge: Judge = Depends(requireJudgeAuth)):
    """Return the current judge's identity."""
    return {
        "id": str(judge.id),
        "name": judge.name,
        "email": judge.email,
        "assignedTeamsCount": len(judge.assigned_teams or []),
    }
