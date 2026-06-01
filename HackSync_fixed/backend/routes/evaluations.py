"""
System 2: Judge Evaluation Routes
  POST /api/evaluations/submit   — Submit judge scores for a team
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from helpers.websocket_manager import ws_manager
from middleware.auth import requireJudgeAuth
from models.database import get_db
from models.models import AnomalyFlag, Evaluation, Judge, Team
from workers.celery_tasks import generate_anomaly_explanation

router = APIRouter(prefix="/api/evaluations", tags=["Evaluations"])


class EvaluationSubmitRequest(BaseModel):
    teamId: str
    scoreCode: int = Field(..., ge=1, le=10)
    scoreInnovation: int = Field(..., ge=1, le=10)
    scorePresentation: int = Field(..., ge=1, le=10)
    comment: str = Field(..., min_length=20, description="Minimum 20 characters required")
    starRating: Optional[int] = Field(default=0, ge=0, le=5)


# ── POST /api/evaluations/submit ──────────────────────────────────────────────
@router.post("/submit")
async def submit_evaluation(
    body: EvaluationSubmitRequest,
    judge: Judge = Depends(requireJudgeAuth),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit judge scores for a team.
    - Idempotency check: 409 if already submitted
    - Runs anomaly detection after saving
    - Returns nextTeamId for auto-advance in UI
    """
    team_id = uuid.UUID(body.teamId)

    # Idempotency: check existing submission
    existing_result = await db.execute(
        select(Evaluation).where(
            Evaluation.judge_id == judge.id,
            Evaluation.team_id == team_id,
            Evaluation.discarded == False,
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already submitted for this team.",
        )

    # Verify team is assigned to this judge
    if judge.assigned_teams and team_id not in judge.assigned_teams:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This team is not assigned to you.",
        )

    # Create evaluation
    evaluation = Evaluation(
        judge_id=judge.id,
        team_id=team_id,
        score_code=body.scoreCode,
        score_innovation=body.scoreInnovation,
        score_presentation=body.scorePresentation,
        star_rating=body.starRating or 0,
        comment=body.comment,
    )
    db.add(evaluation)
    await db.commit()
    await db.refresh(evaluation)

    # Broadcast judge:scored event
    teams_remaining = await _count_remaining_teams(judge, db)
    await ws_manager.broadcast("judge:scored", {
        "judgeId": str(judge.id),
        "judgeName": judge.name,
        "teamId": str(team_id),
        "teamsRemaining": teams_remaining,
    })

    # Run anomaly detection
    await _run_anomaly_detection(
        evaluation=evaluation,
        judge=judge,
        team_id=team_id,
        db=db,
    )

    # Find next unscored team for this judge
    next_team_id = await _find_next_team(judge, team_id, db)

    return {
        "success": True,
        "evaluationId": str(evaluation.id),
        "nextTeamId": next_team_id,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _count_remaining_teams(judge: Judge, db: AsyncSession) -> int:
    """Count how many teams this judge hasn't scored yet."""
    if not judge.assigned_teams:
        return 0
    scored = await db.execute(
        select(Evaluation.team_id).where(
            Evaluation.judge_id == judge.id,
            Evaluation.discarded == False,
        )
    )
    scored_ids = {row[0] for row in scored.all()}
    return sum(1 for tid in judge.assigned_teams if tid not in scored_ids)


async def _find_next_team(
    judge: Judge, just_scored: uuid.UUID, db: AsyncSession
) -> Optional[str]:
    """Return the ID of the next unscored team, or None if all done."""
    if not judge.assigned_teams:
        return None
    scored = await db.execute(
        select(Evaluation.team_id).where(
            Evaluation.judge_id == judge.id,
            Evaluation.discarded == False,
        )
    )
    scored_ids = {row[0] for row in scored.all()}
    for tid in judge.assigned_teams:
        if tid not in scored_ids and tid != just_scored:
            return str(tid)
    return None


async def _run_anomaly_detection(
    evaluation: Evaluation,
    judge: Judge,
    team_id: uuid.UUID,
    db: AsyncSession,
):
    """
    Algorithm from System 3 spec:
      1. Fetch prior scores for this team (excluding current judge)
      2. If < 1 prior score: skip
      3. Compute panel average
      4. Compute deviation
      5. Compare to threshold from event_settings (default 2.5)
      6. If deviation > threshold: create flag, hold team, broadcast, queue Celery task
    """
    from models.models import AnomalyFlag, EventSettings

    # Step 1: Prior scores (excluding this judge)
    prior_result = await db.execute(
        select(Evaluation).where(
            Evaluation.team_id == team_id,
            Evaluation.judge_id != judge.id,
            Evaluation.discarded == False,
        )
    )
    prior_evals = prior_result.scalars().all()

    # Step 2: Need at least 1 prior
    if len(prior_evals) < 1:
        return

    # Step 3: Panel average
    prior_totals = [
        (e.score_code + e.score_innovation + e.score_presentation) / 3
        for e in prior_evals
    ]
    panel_avg = sum(prior_totals) / len(prior_totals)

    # Step 4: New judge's total
    new_total = (
        evaluation.score_code + evaluation.score_innovation + evaluation.score_presentation
    ) / 3

    # Step 5: Deviation
    deviation = abs(new_total - panel_avg)

    # Fetch threshold from event_settings
    threshold_result = await db.execute(
        select(EventSettings).where(EventSettings.key == "anomaly_threshold")  # type: ignore[attr-defined]
    )
    setting = threshold_result.scalar_one_or_none()
    threshold = float(setting.value) if setting else 2.5

    if deviation <= threshold:
        return

    # Step 7: Create anomaly flag
    flag = AnomalyFlag(
        team_id=team_id,
        judge_id=judge.id,
        new_score=round(new_total, 2),
        panel_avg=round(panel_avg, 2),
        deviation=round(deviation, 2),
    )
    db.add(flag)

    # Step 8: Hold results for this team
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    team = team_result.scalar_one_or_none()
    if team:
        team.results_held = True

    await db.commit()
    await db.refresh(flag)

    # Step 9: Broadcast WebSocket event
    await ws_manager.broadcast("anomaly:new", {
        "teamId": str(team_id),
        "teamName": team.name if team else "Unknown",
        "judgeName": judge.name,
        "newScore": round(new_total, 2),
        "panelAvg": round(panel_avg, 2),
        "deviation": round(deviation, 2),
        "flagId": str(flag.id),
    })

    # Step 10: Queue Celery task for LLM explanation
    try:
        generate_anomaly_explanation.delay(str(flag.id))
    except Exception as e:
        # Non-critical — don't fail the submission if Celery is down
        print(f"[Warning] Could not queue anomaly explanation task: {e}")
