from pydantic import BaseModel
from typing import Optional

class EvaluationSubmit(BaseModel):
    teamId: str
    scoreCode: int
    scoreInnovation: int
    scorePresentation: int
    starRating: Optional[int] = 0
    comment: Optional[str] = ""

class OverrideBody(BaseModel):
    overrideScore: float

class ThresholdBody(BaseModel):
    threshold: float

class JudgeCreate(BaseModel):
    name: str
    email: str

class MentorMessage(BaseModel):
    message: str

class ContextUpdate(BaseModel):
    problemStatement: str

class TeamCreate(BaseModel):
    name: str
    problemStatement: str = ""

class TeamMemberCreate(BaseModel):
    teamId: str
    name: str
    email: str = ""
    skill: str = ""
    college: str = ""
