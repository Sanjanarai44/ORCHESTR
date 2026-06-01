from fastapi import Request, HTTPException
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from src.core.config import JWT_SECRET, JWT_ALGORITHM, FRONTEND_URL, JWT_EXPIRY_HOURS

def verify_judge_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "judge_magic_link":
            raise HTTPException(401, "Invalid token type.")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token.")

def get_judge_from_cookie(request: Request, judge_session: Optional[str] = None):
    """Dependency: read judge from session cookie or Authorization header."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = verify_judge_token(token)
            judge_session = payload.get("judgeId")
        except JWTError:
            raise HTTPException(401, "Invalid or expired token.")

    if not judge_session:
        raise HTTPException(401, "Please use your email link to access this page.")
    
    from src.core.database import get_db
    conn = get_db()
    row = conn.execute("SELECT * FROM judges WHERE id = ?", (judge_session,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(401, "Judge not found. Use the original link.")
    return dict(row)

def generate_judge_token(judge_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    return jwt.encode(
        {"sub": judge_id, "judgeId": judge_id, "type": "judge_magic_link", "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def build_magic_link(token: str) -> str:
    """Build a magic link that stays valid for the duration of the event."""
    return f"{FRONTEND_URL}/judge/verify?token={token}"
