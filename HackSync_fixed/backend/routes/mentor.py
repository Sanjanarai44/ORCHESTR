"""
System 5: AI Mentor Routes
  GET  /api/mentor/session         — Get conversation history for this team
  POST /api/mentor/message         — Send a message, get Socratic AI response
  PUT  /api/mentor/context         — Update team problem statement context
  GET  /api/admin/mentor-logs      — Admin: all conversations across all teams
"""
import re
import uuid
from datetime import datetime
from typing import List, Optional

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from models.database import get_db
from models.models import MentorConversation, MentorRoleEnum, Team

router = APIRouter(tags=["Mentor"])

_anthropic = None


def get_anthropic_client() -> AsyncAnthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _anthropic


MENTOR_SYSTEM_PROMPT = """You are an AI mentor for a hackathon. Your ONLY job is to ask questions that help teams think more clearly.

STRICT RULES:
- You must NEVER write any code.
- You must NEVER give direct answers or solutions.
- You must NEVER complete tasks for the team.
- Every single response you give must be a question — nothing else.
- If you find yourself about to give advice, reframe it as a question instead.
- Do not use bullet points, numbered lists, or code blocks.
- Keep your response to 1–3 sentences maximum, all in question form.

The team is working on: {problem_statement}"""

FALLBACK_QUESTION = "What aspect of your problem feels most unclear right now?"

CODE_BLOCK_PATTERN = re.compile(r"```|\t    ")
IMPERATIVE_PATTERN = re.compile(
    r"\b(you should|try doing|use |implement|build|create|add|make sure)\b",
    re.IGNORECASE,
)


# ── Participant token dependency (simplified) ─────────────────────────────────
# In the full system, this reads a participant JWT cookie.
# For now: reads participant_team_id cookie set by participant portal.

async def get_participant_team(
    # participant_team: Optional[str] = Cookie(default=None),
    # For demo, we use query param ?teamId= (replace with cookie in prod)
    teamId: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Team:
    if not teamId:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Team authentication required.",
        )
    result = await db.execute(select(Team).where(Team.id == uuid.UUID(teamId)))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")
    return team


def _is_hacking_phase() -> bool:
    """
    Check if the current event stage is hacking_phase.
    In production, reads from event_settings or a global event state table.
    For demo: always True during development.
    """
    if settings.ENVIRONMENT == "development":
        return True
    return True  # Replace with DB lookup in production


# ── GET /api/mentor/session ───────────────────────────────────────────────────
@router.get("/api/mentor/session")
async def get_mentor_session(
    team: Team = Depends(get_participant_team),
    db: AsyncSession = Depends(get_db),
):
    if not _is_hacking_phase():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mentor not available outside hacking phase.",
        )

    result = await db.execute(
        select(MentorConversation)
        .where(MentorConversation.team_id == team.id)
        .order_by(MentorConversation.timestamp.asc())
    )
    messages = result.scalars().all()

    return {
        "teamName": team.name,
        "problemStatement": team.problem_statement or "",
        "messages": [
            {
                "role": m.role.value,
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ],
    }


# ── POST /api/mentor/message ──────────────────────────────────────────────────
class MentorMessageRequest(BaseModel):
    message: str


@router.post("/api/mentor/message")
async def send_mentor_message(
    body: MentorMessageRequest,
    team: Team = Depends(get_participant_team),
    db: AsyncSession = Depends(get_db),
):
    if not _is_hacking_phase():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mentor not available outside hacking phase.",
        )

    # Save user message
    user_msg = MentorConversation(
        team_id=team.id,
        role=MentorRoleEnum.user,
        content=body.message,
        timestamp=datetime.utcnow(),
    )
    db.add(user_msg)
    await db.flush()

    # Fetch conversation history for context
    history_result = await db.execute(
        select(MentorConversation)
        .where(MentorConversation.team_id == team.id)
        .order_by(MentorConversation.timestamp.asc())
        .limit(20)  # last 20 messages for context window
    )
    history = history_result.scalars().all()

    # Build messages for Claude
    system = MENTOR_SYSTEM_PROMPT.format(
        problem_statement=team.problem_statement or "an innovative technical solution"
    )
    conversation = [
        {"role": msg.role.value, "content": msg.content}
        for msg in history
    ]

    # Generate with up to 2 regeneration attempts
    reply = await _generate_mentor_reply(system, conversation, max_attempts=2)

    # Save assistant response
    assistant_msg = MentorConversation(
        team_id=team.id,
        role=MentorRoleEnum.assistant,
        content=reply,
        timestamp=datetime.utcnow(),
    )
    db.add(assistant_msg)
    await db.commit()

    return {
        "reply": reply,
        "timestamp": assistant_msg.timestamp.isoformat(),
    }


async def _generate_mentor_reply(
    system: str, conversation: List[dict], max_attempts: int = 2
) -> str:
    """Generate Socratic mentor response with validation loop."""
    client = get_anthropic_client()

    for attempt in range(max_attempts + 1):
        try:
            messages = conversation.copy()
            if attempt > 0:
                messages.append({
                    "role": "user",
                    "content": "Remember: you must only respond with a question. No code, no direct advice.",
                })

            response = await client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=256,
                system=system,
                messages=messages,
            )
            reply = response.content[0].text.strip()

            # Validate: no code blocks
            if CODE_BLOCK_PATTERN.search(reply):
                continue

            # Validate: no imperative statements
            if IMPERATIVE_PATTERN.search(reply):
                continue

            # Must end with a question mark (or contain one)
            if "?" not in reply:
                continue

            return reply

        except Exception as e:
            print(f"[Mentor] LLM call failed on attempt {attempt + 1}: {e}")

    return FALLBACK_QUESTION


# ── PUT /api/mentor/context ───────────────────────────────────────────────────
class ContextUpdateRequest(BaseModel):
    problemStatement: str


@router.put("/api/mentor/context")
async def update_mentor_context(
    body: ContextUpdateRequest,
    team: Team = Depends(get_participant_team),
    db: AsyncSession = Depends(get_db),
):
    team.problem_statement = body.problemStatement
    await db.commit()
    return {"success": True, "problemStatement": body.problemStatement}


# ── GET /api/admin/mentor-logs ────────────────────────────────────────────────
@router.get("/api/admin/mentor-logs")
async def get_mentor_logs(
    db: AsyncSession = Depends(get_db),
):
    """Admin read-only view of all mentor conversations grouped by team."""
    teams_result = await db.execute(select(Team))
    teams = teams_result.scalars().all()

    output = []
    for team in teams:
        msgs_result = await db.execute(
            select(MentorConversation)
            .where(MentorConversation.team_id == team.id)
            .order_by(MentorConversation.timestamp.asc())
        )
        msgs = msgs_result.scalars().all()
        output.append({
            "teamId": str(team.id),
            "teamName": team.name,
            "messageCount": len(msgs),
            "messages": [
                {
                    "role": m.role.value,
                    "content": m.content,
                    "timestamp": m.timestamp.isoformat(),
                }
                for m in msgs
            ],
        })

    return {"teams": output}
