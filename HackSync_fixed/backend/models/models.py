"""
SQLAlchemy ORM models for all of Shraddha's systems:
  - System 1: Judge (JWT magic-link auth)
  - System 2: Evaluation (judge scoring)
  - System 3: AnomalyFlag (anti-cheat detection)
  - System 4: EmailLog (async email worker)
  - System 5: MentorConversation (AI mentor chat)
  + Shared: Team (referenced by evaluations/anomalies/mentor)
  + Shared: EventSettings (configurable thresholds)
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ── Shared: Team ─────────────────────────────────────────────────────────────
# Minimal representation — primary team data owned by T3 (Hargun).
# We reference team_id in evaluations / anomaly flags / mentor convos.
class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    problem_statement = Column(Text)
    evaluation_guide = Column(Text)
    results_held = Column(Boolean, default=False)
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    evaluations = relationship("Evaluation", back_populates="team")
    anomaly_flags = relationship("AnomalyFlag", back_populates="team")
    mentor_conversations = relationship("MentorConversation", back_populates="team")


# ── Shared: TeamMember ────────────────────────────────────────────────────────
class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    skill = Column(String(100))   # Frontend / Backend / Designer / etc.
    college = Column(String(255))


# ── System 1: Judge ───────────────────────────────────────────────────────────
class Judge(Base):
    __tablename__ = "judges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    jwt_token = Column(Text)
    token_used = Column(Boolean, default=False)
    # Stored as JSON string in SQLite
    assigned_teams = Column(String, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    evaluations = relationship("Evaluation", back_populates="judge")
    anomaly_flags = relationship("AnomalyFlag", back_populates="judge")


# ── System 2: Evaluation ──────────────────────────────────────────────────────
class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    judge_id = Column(String(36), ForeignKey("judges.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    score_code = Column(Integer, CheckConstraint("score_code BETWEEN 1 AND 10"))
    score_innovation = Column(Integer, CheckConstraint("score_innovation BETWEEN 1 AND 10"))
    score_presentation = Column(Integer, CheckConstraint("score_presentation BETWEEN 1 AND 10"))
    star_rating = Column(Integer, CheckConstraint("star_rating BETWEEN 0 AND 5"), default=0)
    comment = Column(Text, nullable=False)
    discarded = Column(Boolean, default=False)
    override_score = Column(Float)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("judge_id", "team_id", name="uq_judge_team"),)

    # Relationships
    judge = relationship("Judge", back_populates="evaluations")
    team = relationship("Team", back_populates="evaluations")


# ── System 3: AnomalyFlag ─────────────────────────────────────────────────────
class AnomalyStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"


class AnomalyResolutionEnum(str, enum.Enum):
    accepted = "accepted"
    discarded = "discarded"
    overridden = "overridden"


class AnomalyFlag(Base):
    __tablename__ = "anomaly_flags"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    judge_id = Column(String(36), ForeignKey("judges.id"), nullable=False)
    new_score = Column(Float, nullable=False)
    panel_avg = Column(Float, nullable=False)
    deviation = Column(Float, nullable=False)
    llm_explanation = Column(Text)
    status = Column(
        Enum(AnomalyStatusEnum, name="anomaly_status_enum"),
        default=AnomalyStatusEnum.PENDING,
    )
    resolution = Column(
        Enum(AnomalyResolutionEnum, name="anomaly_resolution_enum"),
        nullable=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="anomaly_flags")
    judge = relationship("Judge", back_populates="anomaly_flags")


# ── System 4: EmailLog ────────────────────────────────────────────────────────
class EmailStatusEnum(str, enum.Enum):
    SENT = "SENT"
    FAILED = "FAILED"
    PENDING = "PENDING"


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_id = Column(String(36), nullable=False)
    recipient_email = Column(String(255))
    recipient_name = Column(String(255))
    email_type = Column(String(50), nullable=False)
    status = Column(
        Enum(EmailStatusEnum, name="email_status_enum"),
        default=EmailStatusEnum.PENDING,
    )
    sent_at = Column(DateTime)
    error_message = Column(Text)
    attempts = Column(Integer, default=0)
    job_id = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)


# ── System 5: MentorConversation ──────────────────────────────────────────────
class MentorRoleEnum(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class MentorConversation(Base):
    __tablename__ = "mentor_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    role = Column(
        Enum(MentorRoleEnum, name="mentor_role_enum"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship
    team = relationship("Team", back_populates="mentor_conversations")


# ── Shared: EventSettings ─────────────────────────────────────────────────────
class EventSettings(Base):
    __tablename__ = "event_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
