"""
Authentication middleware / FastAPI dependencies.

requireJudgeAuth — guards all /api/judge/* routes.
  Reads judge_id from the session cookie set after magic-link verification.
  Fetches judge from DB and confirms token_used = True (authenticated).

requireAdminAuth — simple secret-key check for admin routes.
  Reads X-Admin-Key header. In dev mode, any value passes.
"""
import uuid
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.database import get_db
from models.models import Judge


# ── Judge auth ────────────────────────────────────────────────────────────────

async def requireJudgeAuth(
    judge_session: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Judge:
    """
    Dependency that validates the judge session cookie.
    Returns the Judge ORM object if valid.
    Raises 401 if the cookie is missing, malformed, or the judge hasn't
    completed magic-link verification (token_used must be True).
    """
    if not judge_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please use your email link to access this page.",
        )

    # Parse judge_id from cookie value
    try:
        judge_id = uuid.UUID(judge_session)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session. Please use your email link to access this page.",
        )

    result = await db.execute(select(Judge).where(Judge.id == judge_id))
    judge = result.scalar_one_or_none()

    if not judge:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Judge not found. Please use your email link to access this page.",
        )

    if not judge.token_used:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please use your email link to access this page.",
        )

    return judge


# ── Admin auth ────────────────────────────────────────────────────────────────

async def requireAdminAuth(
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
) -> bool:
    """
    Simple header-based admin auth.
    In production set ADMIN_SECRET in env and compare.
    For dev: pass through.
    """
    from config.settings import settings
    if settings.ENVIRONMENT == "development":
        return True

    admin_secret = getattr(settings, "ADMIN_SECRET", "")
    if not admin_secret or x_admin_key != admin_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin access required.",
        )
    return True
