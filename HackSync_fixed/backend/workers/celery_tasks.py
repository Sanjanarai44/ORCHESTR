"""
Celery Tasks — Async background tasks for Shraddha's modules.

Tasks:
  generate_anomaly_explanation  — Calls Claude API to explain why a flagged score is suspicious
  send_evaluation_reminder      — Queues reminder emails to judges who haven't completed scores
"""
import asyncio
from datetime import datetime

from celery import shared_task
from celery.utils.log import get_task_logger

from workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    name="workers.celery_tasks.generate_anomaly_explanation",
    max_retries=3,
    default_retry_delay=10,
)
def generate_anomaly_explanation(self, flag_id: str):
    """
    Generate an LLM explanation for an anomaly flag using Claude API.
    Saves the explanation to anomaly_flags.llm_explanation.

    Called after POST /api/evaluations/submit detects a deviation > threshold.
    """
    try:
        asyncio.run(_async_generate_explanation(flag_id))
    except Exception as exc:
        logger.error(f"[Celery] generate_anomaly_explanation failed for flag {flag_id}: {exc}")
        raise self.retry(exc=exc)


async def _async_generate_explanation(flag_id: str):
    """Async inner function that actually calls Claude and updates the DB."""
    from anthropic import AsyncAnthropic
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.future import select
    from sqlalchemy.orm import sessionmaker

    from config.settings import settings
    from models.models import AnomalyFlag, Judge, Team

    # Build DB connection
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    import uuid

    async with async_session() as session:
        # Fetch flag
        flag_result = await session.execute(
            select(AnomalyFlag).where(AnomalyFlag.id == uuid.UUID(flag_id))
        )
        flag = flag_result.scalar_one_or_none()
        if not flag:
            logger.warning(f"[Celery] AnomalyFlag {flag_id} not found — skipping explanation")
            return

        # Fetch team and judge
        team_result = await session.execute(select(Team).where(Team.id == flag.team_id))
        team = team_result.scalar_one_or_none()

        judge_result = await session.execute(select(Judge).where(Judge.id == flag.judge_id))
        judge = judge_result.scalar_one_or_none()

        team_name = team.name if team else "Unknown Team"
        judge_name = judge.name if judge else "Unknown Judge"

        # Count other judges who scored this team
        from models.models import Evaluation
        prior_count_result = await session.execute(
            select(Evaluation).where(
                Evaluation.team_id == flag.team_id,
                Evaluation.judge_id != flag.judge_id,
                Evaluation.discarded == False,
            )
        )
        n_other = len(prior_count_result.scalars().all())

        # Build prompt
        prompt = (
            f"Judge {judge_name} submitted a score of {flag.new_score:.1f}/10 for Team {team_name}. "
            f"The panel average from {n_other} other judge(s) is {flag.panel_avg:.1f}/10. "
            f"The deviation is {flag.deviation:.1f} points. "
            f"In 2 sentences, explain why this score is statistically suspicious and what the "
            f"committee should look for when reviewing it."
        )

        # Call Claude
        try:
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            explanation = response.content[0].text.strip()
        except Exception as e:
            logger.error(f"[Celery] Claude API call failed: {e}")
            explanation = (
                f"Judge {judge_name} scored {flag.new_score:.1f}/10 which deviates "
                f"{flag.deviation:.1f} points from the panel average of {flag.panel_avg:.1f}/10. "
                f"The committee should review this evaluation before publishing results."
            )

        # Save explanation to DB
        flag.llm_explanation = explanation
        await session.commit()
        logger.info(f"[Celery] Anomaly explanation saved for flag {flag_id}")

    await engine.dispose()
