"""
System 3: Anomaly Detection Resolution Routes
  POST /api/anomalies/{flagId}/accept    — Keep score, resolve flag
  POST /api/anomalies/{flagId}/discard   — Soft-delete score from leaderboard calc
  POST /api/anomalies/{flagId}/override  — Set manual override score
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from helpers.websocket_manager import ws_manager
from middleware.auth import requireAdminAuth
from models.database import get_db
from models.models import AnomalyFlag, AnomalyResolutionEnum, AnomalyStatusEnum, Evaluation, Team

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])


class OverrideRequest(BaseModel):
    overrideScore: float = Field(..., ge=1.0, le=10.0)


async def _get_flag_or_404(flag_id: uuid.UUID, db: AsyncSession) -> AnomalyFlag:
    result = await db.execute(select(AnomalyFlag).where(AnomalyFlag.id == flag_id))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly flag not found.")
    if flag.status == AnomalyStatusEnum.RESOLVED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This flag has already been resolved.")
    return flag


async def _unhold_team(team_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team:
        team.results_held = False


# ── POST /api/anomalies/{flagId}/accept ───────────────────────────────────────
@router.post("/{flagId}/accept")
async def accept_anomaly(
    flagId: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """Keep the flagged score in the leaderboard calculation and resolve the flag."""
    flag = await _get_flag_or_404(uuid.UUID(flagId), db)
    flag.status = AnomalyStatusEnum.RESOLVED
    flag.resolution = AnomalyResolutionEnum.accepted
    await _unhold_team(flag.team_id, db)
    await db.commit()

    await ws_manager.broadcast("anomaly:resolved", {
        "flagId": str(flag.id),
        "resolution": "accepted",
    })

    return {"success": True, "resolution": "accepted", "flagId": str(flag.id)}


# ── POST /api/anomalies/{flagId}/discard ──────────────────────────────────────
@router.post("/{flagId}/discard")
async def discard_anomaly(
    flagId: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """Soft-delete the judge's score for this team (mark discarded, not deleted)."""
    flag = await _get_flag_or_404(uuid.UUID(flagId), db)

    # Soft-delete the evaluation
    eval_result = await db.execute(
        select(Evaluation).where(
            Evaluation.judge_id == flag.judge_id,
            Evaluation.team_id == flag.team_id,
            Evaluation.discarded == False,
        )
    )
    evaluation = eval_result.scalar_one_or_none()
    if evaluation:
        evaluation.discarded = True

    flag.status = AnomalyStatusEnum.RESOLVED
    flag.resolution = AnomalyResolutionEnum.discarded
    await _unhold_team(flag.team_id, db)
    await db.commit()

    await ws_manager.broadcast("anomaly:resolved", {
        "flagId": str(flag.id),
        "resolution": "discarded",
    })

    return {"success": True, "resolution": "discarded", "flagId": str(flag.id)}


# ── POST /api/anomalies/{flagId}/override ─────────────────────────────────────
@router.post("/{flagId}/override")
async def override_anomaly(
    flagId: str,
    body: OverrideRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """Set a manual override score for the flagged judge+team combination."""
    flag = await _get_flag_or_404(uuid.UUID(flagId), db)

    eval_result = await db.execute(
        select(Evaluation).where(
            Evaluation.judge_id == flag.judge_id,
            Evaluation.team_id == flag.team_id,
            Evaluation.discarded == False,
        )
    )
    evaluation = eval_result.scalar_one_or_none()
    if evaluation:
        evaluation.override_score = body.overrideScore

    flag.status = AnomalyStatusEnum.RESOLVED
    flag.resolution = AnomalyResolutionEnum.overridden
    await _unhold_team(flag.team_id, db)
    await db.commit()

    await ws_manager.broadcast("anomaly:resolved", {
        "flagId": str(flag.id),
        "resolution": "overridden",
        "overrideScore": body.overrideScore,
    })

    return {
        "success": True,
        "resolution": "overridden",
        "overrideScore": body.overrideScore,
        "flagId": str(flag.id),
    }
