"""
System 3 Admin Routes (anomaly-related settings)
  PUT /api/admin/settings/anomaly-threshold   — Update configurable threshold
  GET /api/admin/settings/anomaly-threshold   — Get current threshold
  GET /api/admin/judge-calibration-report     — Per-judge bias analysis
  GET /api/admin/anomaly-flags                — List all pending/resolved flags
"""
import math
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from middleware.auth import requireAdminAuth
from models.database import get_db
from models.models import AnomalyFlag, AnomalyStatusEnum, Evaluation, EventSettings, Judge

router = APIRouter(prefix="/api/admin", tags=["Admin Settings"])


class ThresholdRequest(BaseModel):
    threshold: float = Field(..., ge=0.1, le=10.0)


# ── PUT /api/admin/settings/anomaly-threshold ─────────────────────────────────
@router.put("/settings/anomaly-threshold")
async def update_anomaly_threshold(
    body: ThresholdRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    result = await db.execute(
        select(EventSettings).where(EventSettings.key == "anomaly_threshold")
    )
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = str(body.threshold)
        setting.updated_at = datetime.utcnow()
    else:
        setting = EventSettings(key="anomaly_threshold", value=str(body.threshold))
        db.add(setting)

    await db.commit()
    return {"success": True, "threshold": body.threshold}


# ── GET /api/admin/settings/anomaly-threshold ─────────────────────────────────
@router.get("/settings/anomaly-threshold")
async def get_anomaly_threshold(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    result = await db.execute(
        select(EventSettings).where(EventSettings.key == "anomaly_threshold")
    )
    setting = result.scalar_one_or_none()
    threshold = float(setting.value) if setting else 2.5
    return {"threshold": threshold}


# ── GET /api/admin/judge-calibration-report ───────────────────────────────────
@router.get("/judge-calibration-report")
async def get_calibration_report(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """
    Per-judge calibration report:
    - Average score across all teams
    - Standard deviation
    - Bias label: Harsh / Neutral / Lenient
    """
    judges_result = await db.execute(select(Judge))
    judges = judges_result.scalars().all()

    # Global average: average across all non-discarded evaluations
    all_evals_result = await db.execute(
        select(Evaluation).where(Evaluation.discarded == False)
    )
    all_evals = all_evals_result.scalars().all()

    if all_evals:
        global_avg = sum(
            (e.score_code + e.score_innovation + e.score_presentation) / 3
            for e in all_evals
        ) / len(all_evals)
    else:
        global_avg = 5.0

    report = []
    for judge in judges:
        judge_evals_result = await db.execute(
            select(Evaluation).where(
                Evaluation.judge_id == judge.id,
                Evaluation.discarded == False,
            )
        )
        judge_evals = judge_evals_result.scalars().all()

        if not judge_evals:
            report.append({
                "id": str(judge.id),
                "name": judge.name,
                "email": judge.email,
                "avg": None,
                "stdDev": None,
                "bias": "No data",
                "scoresByTeam": [],
            })
            continue

        scores = [
            (e.score_code + e.score_innovation + e.score_presentation) / 3
            for e in judge_evals
        ]
        avg = sum(scores) / len(scores)
        variance = sum((s - avg) ** 2 for s in scores) / len(scores)
        std_dev = math.sqrt(variance)

        # Bias label
        if avg < (global_avg - 1.5):
            bias = "Harsh"
        elif avg > (global_avg + 1.5):
            bias = "Lenient"
        else:
            bias = "Neutral"

        report.append({
            "id": str(judge.id),
            "name": judge.name,
            "email": judge.email,
            "avg": round(avg, 2),
            "stdDev": round(std_dev, 2),
            "bias": bias,
            "scoresByTeam": [
                {
                    "teamId": str(e.team_id),
                    "total": round(
                        (e.score_code + e.score_innovation + e.score_presentation) / 3, 2
                    ),
                    "code": e.score_code,
                    "innovation": e.score_innovation,
                    "presentation": e.score_presentation,
                }
                for e in judge_evals
            ],
        })

    return {
        "globalAvg": round(global_avg, 2),
        "judges": report,
    }


# ── GET /api/admin/anomaly-flags ──────────────────────────────────────────────
@router.get("/anomaly-flags")
async def get_anomaly_flags(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """Return all anomaly flags, optionally filtered by status (PENDING / RESOLVED)."""
    query = select(AnomalyFlag)
    if status_filter == "PENDING":
        query = query.where(AnomalyFlag.status == AnomalyStatusEnum.PENDING)
    elif status_filter == "RESOLVED":
        query = query.where(AnomalyFlag.status == AnomalyStatusEnum.RESOLVED)

    result = await db.execute(query.order_by(AnomalyFlag.created_at.desc()))
    flags = result.scalars().all()

    from models.models import Team, Judge as JudgeModel

    output = []
    for flag in flags:
        team_result = await db.execute(select(Team).where(Team.id == flag.team_id))
        team = team_result.scalar_one_or_none()
        judge_result = await db.execute(select(JudgeModel).where(JudgeModel.id == flag.judge_id))
        judge = judge_result.scalar_one_or_none()

        output.append({
            "id": str(flag.id),
            "teamId": str(flag.team_id),
            "teamName": team.name if team else "Unknown",
            "judgeId": str(flag.judge_id),
            "judgeName": judge.name if judge else "Unknown",
            "newScore": flag.new_score,
            "panelAvg": flag.panel_avg,
            "deviation": flag.deviation,
            "llmExplanation": flag.llm_explanation,
            "status": flag.status.value,
            "resolution": flag.resolution.value if flag.resolution else None,
            "createdAt": flag.created_at.isoformat(),
        })

    return {"flags": output}
