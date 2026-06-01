"""
System 4: Admin Email Routes
  GET  /api/admin/email-logs         — Paginated email log with filters
  POST /api/admin/emails/{id}/retry  — Re-queue a failed email
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from middleware.auth import requireAdminAuth
from models.database import get_db
from models.models import EmailLog, EmailStatusEnum

router = APIRouter(prefix="/api/admin", tags=["Admin Emails"])


# ── GET /api/admin/email-logs ─────────────────────────────────────────────────
@router.get("/email-logs")
async def get_email_logs(
    type: Optional[str] = Query(default="all"),
    status_filter: Optional[str] = Query(default="all", alias="status"),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """
    Paginated email log with filters:
    - type: all | magic_link | welcome | reminder | results | anomaly_alert
    - status: all | sent | failed | pending
    - search: recipient name or email substring
    """
    query = select(EmailLog)

    if type != "all":
        query = query.where(EmailLog.email_type == type)

    if status_filter != "all":
        status_map = {
            "sent": EmailStatusEnum.SENT,
            "failed": EmailStatusEnum.FAILED,
            "pending": EmailStatusEnum.PENDING,
        }
        if status_filter.lower() in status_map:
            query = query.where(EmailLog.status == status_map[status_filter.lower()])

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                EmailLog.recipient_email.ilike(pattern),
                EmailLog.recipient_name.ilike(pattern),
            )
        )

    # Count total
    count_result = await db.execute(query)
    total = len(count_result.scalars().all())

    # Paginate
    query = query.order_by(EmailLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [
            {
                "id": str(log.id),
                "recipientId": str(log.recipient_id),
                "recipientEmail": log.recipient_email,
                "recipientName": log.recipient_name,
                "emailType": log.email_type,
                "status": log.status.value,
                "sentAt": log.sent_at.isoformat() if log.sent_at else None,
                "errorMessage": log.error_message,
                "attempts": log.attempts,
                "jobId": log.job_id,
                "createdAt": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


# ── POST /api/admin/emails/{id}/retry ─────────────────────────────────────────
@router.post("/emails/{logId}/retry")
async def retry_email(
    logId: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(requireAdminAuth),
):
    """Re-queue a failed email job via BullMQ."""
    result = await db.execute(
        select(EmailLog).where(EmailLog.id == uuid.UUID(logId))
    )
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email log not found.")

    if log.status != EmailStatusEnum.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only FAILED emails can be retried.",
        )

    # Re-queue via Redis/BullMQ
    new_job_id = await _requeue_email(log)

    log.status = EmailStatusEnum.PENDING
    log.job_id = new_job_id
    log.error_message = None
    await db.commit()

    return {"success": True, "newJobId": new_job_id, "logId": str(log.id)}


async def _requeue_email(log: EmailLog) -> str:
    """Push the email back onto the BullMQ queue in Redis."""
    import json
    import uuid as uuid_mod
    import redis.asyncio as aioredis

    new_job_id = str(uuid_mod.uuid4())
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        job_data = {
            "name": "send_email",
            "data": {
                "recipientId": str(log.recipient_id),
                "recipientEmail": log.recipient_email,
                "emailType": log.email_type,
                "templateData": {},
            },
            "opts": {"attempts": 3, "jobId": new_job_id},
        }
        await r.lpush("bull:email_queue:wait", json.dumps(job_data))
        await r.close()
    except Exception as e:
        print(f"[Warning] Could not requeue email: {e}")

    return new_job_id
