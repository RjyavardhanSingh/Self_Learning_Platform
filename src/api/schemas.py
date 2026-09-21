"""Pydantic request/response models — structured around the 6-step loop.

Flow: Upload → Goal → Preparing → Practice → Results → Retest
No extensions beyond this loop (no verification/auth).

Each section maps 1:1 to a user step. Shared enums stay at top.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from models.goal import GoalLevel
from models.material import MaterialKind

# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------


class MaterialResponse(BaseModel):
    """Returned after any Upload."""

    id: str
    name: str
    kind: str
    page_count: int
    word_count: int


# ---------------------------------------------------------------------------
# 1. Upload — add study material (PDF / text / Markdown)
# Single unified entry: POST /materials handles both JSON text and multipart PDF.
# The duplicate POST /materials/upload is kept as alias for backward compat.
# ---------------------------------------------------------------------------


class MaterialUpload(BaseModel):
    """Upload pasted text or markdown (JSON body)."""

    content: str = Field(min_length=1, max_length=50000)
    name: str = Field(default="pasted-notes.txt", max_length=255)
    kind: MaterialKind = MaterialKind.TEXT


# ---------------------------------------------------------------------------
# 2. Goal — what the learner wants to achieve
# POST /contexts
# ---------------------------------------------------------------------------


class ContextCreate(BaseModel):
    """Goal + source selection. Creates a LearningContext (cached + persisted)."""

    material_ids: list[str] = Field(min_length=1, max_length=10)
    subject: str = Field(min_length=1, max_length=100)
    target: str = Field(min_length=1, max_length=200)
    level: GoalLevel = GoalLevel.INTERMEDIATE
    deadline: date | None = None
    language: str = Field(default="en", max_length=10)


class ContextStatsResponse(BaseModel):
    source_count: int
    page_count: int
    word_count: int
    reading_minutes: int


class ContextResponse(BaseModel):
    """Goal + derived stats — the contract for Preparing."""

    id: str
    subject: str
    target: str
    stats: ContextStatsResponse


# ---------------------------------------------------------------------------
# 3. Preparing — build practice set from context
# POST /contexts/{id}/questions  +  GET /contexts/{id}/questions
# LLM-tested first: placeholder now, pluggable generator later.
# ---------------------------------------------------------------------------


class QuestionGenerate(BaseModel):
    count: int = Field(default=10, ge=1, le=20)


class QuestionResponse(BaseModel):
    id: int | None = None
    text: str
    topic: str | None = None
    difficulty: str | None = None
    target_concepts: list[str] = []
    required_relationships: list[str] = []
    acceptable_alternatives: list[str] = []
    common_misconceptions: list[str] = []
    reference_answer: str | None = None
    scoring_rubric: dict | None = None
    source_citations: list[str] = []


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse]


# ---------------------------------------------------------------------------
# 4. Practice — session lifecycle (one question at a time)
# POST /sessions  +  GET /sessions/{id}  +  POST /sessions/{id}/answer
# ---------------------------------------------------------------------------


class SessionCreate(BaseModel):
    context_id: str


class SessionResponse(BaseModel):
    id: str
    context_id: str
    question_count: int
    current_index: int
    status: str  # active | completed


class AnswerSubmit(BaseModel):
    question_index: int = Field(ge=0)
    answer_text: str = Field(max_length=5000)
    skipped: bool = False  # PRD §9.3 — always allowed


class AnswerResponse(BaseModel):
    question_index: int
    score: int = Field(ge=0, le=100)
    feedback: str
    concept_coverage: list[str] = []
    concepts_missed: list[str] = []
    misconceptions_found: list[str] = []


# ---------------------------------------------------------------------------
# 5. Results — readiness + weak areas (end of session)
# POST /sessions/{id}/complete  +  GET /sessions/{id}/results
# ---------------------------------------------------------------------------


class SessionCompleteResponse(BaseModel):
    id: str
    readiness_score: int = Field(ge=0, le=100)
    questions: list[dict]
    answers: list[dict]
    scores: list[dict]
    completed_at: str


class SessionResultsResponse(BaseModel):
    """Read-only view of Results (no re-compute). Maps to PRD §10."""

    id: str
    readiness_score: int
    questions: list[dict]
    answers: list[dict]
    scores: list[dict]
    completed_at: str | None = None


# ---------------------------------------------------------------------------
# 6. Retest — one-tap targeted practice on weak areas
# POST /sessions/{id}/retest
# ---------------------------------------------------------------------------


class RetestCreate(BaseModel):
    count: int = Field(default=5, ge=1, le=10)


class RetestResponse(BaseModel):
    id: str  # new session id
    parent_session_id: str
    context_id: str
    question_count: int
    status: str
