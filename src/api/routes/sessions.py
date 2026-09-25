"""Practice → Results → Retest — session lifecycle."""

from fastapi import APIRouter, Depends, HTTPException

from api.schemas import (
    AnswerResponse,
    AnswerSubmit,
    RetestCreate,
    RetestResponse,
    SessionCompleteResponse,
    SessionCreate,
    SessionResponse,
    SessionResultsResponse,
)
from cache import CacheService, get_cache
from db.connection import Database, get_db
from services import question_service, session_service
from services.session_service import (
    InvalidAnswerError,
    RetestWindowExpiredError,
    SessionConflictError,
    SessionNotFoundError,
)

router = APIRouter(prefix="/sessions")


@router.post(
    "", response_model=SessionResponse, tags=["Practice"], summary="Practice — start session"
)
async def create_session(
    payload: SessionCreate,
    cache: CacheService = Depends(get_cache),
):
    """Step 4 — Practice: start session from prepared questions (Dragonfly)."""
    questions = await question_service.get_questions(cache, payload.context_id)
    if questions is None:
        raise HTTPException(status_code=404, detail="Generate questions first")

    state = await session_service.create_session(cache, payload.context_id, questions)
    return SessionResponse(
        id=state["id"],
        context_id=state["context_id"],
        question_count=len(state["questions"]),
        current_index=state["current_index"],
        status=state["status"],
    )


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    tags=["Practice"],
    summary="Practice — get session",
)
async def get_session(
    session_id: str,
    cache: CacheService = Depends(get_cache),
):
    """Step 4 — Practice: get current session state."""
    state = await session_service.get_session(cache, session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        id=state["id"],
        context_id=state["context_id"],
        question_count=len(state["questions"]),
        current_index=state["current_index"],
        status=state["status"],
    )


@router.post(
    "/{session_id}/answer",
    response_model=AnswerResponse,
    tags=["Practice"],
    summary="Practice — submit answer",
)
async def submit_answer(
    session_id: str,
    payload: AnswerSubmit,
    cache: CacheService = Depends(get_cache),
    db: Database = Depends(get_db),
):
    """Step 4 — Practice: submit answer (supports skipped=true per PRD §9.3).

    Scoring runs in the background; the response returns immediately with
    status pending, and the score arrives via GET session polling.
    """
    try:
        record = await session_service.submit_answer(
            cache,
            session_id,
            payload.question_index,
            payload.answer_text,
            skipped=payload.skipped,
            db=db,
        )
    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SessionConflictError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except InvalidAnswerError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return AnswerResponse(**record)


@router.post(
    "/{session_id}/complete",
    response_model=SessionCompleteResponse,
    tags=["Results"],
    summary="Results — complete session",
)
async def complete_session(
    session_id: str,
    cache: CacheService = Depends(get_cache),
    db: Database = Depends(get_db),
):
    """Step 5 — Results: compute readiness, persist to DB, clear cache."""
    try:
        state = await session_service.complete_session(cache, db, session_id)
    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SessionConflictError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    return SessionCompleteResponse(
        id=state["id"],
        readiness_score=state["readiness_score"],
        questions=state["questions"],
        answers=state["answers"],
        scores=state["scores"],
        completed_at=state["completed_at"],
        topic_summary=state.get("topic_summary", {}),
        weak_topics=state.get("weak_topics", []),
        next_review_suggestion=state.get("next_review_suggestion"),
    )


@router.get(
    "/{session_id}/results",
    response_model=SessionResultsResponse,
    tags=["Results"],
    summary="Results — fetch results",
)
async def get_results(
    session_id: str,
    cache: CacheService = Depends(get_cache),
    db: Database = Depends(get_db),
):
    """Step 5 — Results: read-only fetch (cache → DB fallback)."""
    # cache first (active or just-completed still cached briefly)
    state = await session_service.get_session(cache, session_id)
    if state is not None and state.get("status") == "completed":
        return SessionResultsResponse(
            id=state["id"],
            readiness_score=state["readiness_score"],
            questions=state["questions"],
            answers=state["answers"],
            scores=state["scores"],
            completed_at=state.get("completed_at"),
            topic_summary=state.get("topic_summary", {}),
            weak_topics=state.get("weak_topics", []),
            next_review_suggestion=state.get("next_review_suggestion"),
        )
    # DB fallback
    row = await db.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Results not found")
    import json as _json

    def _load(v, default):
        if v is None:
            return default
        return _json.loads(v) if isinstance(v, str) else v

    record = dict(row)
    return SessionResultsResponse(
        id=record["id"],
        readiness_score=record["readiness_score"] or 0,
        questions=_load(record["questions"], []),
        answers=_load(record["answers"], []),
        scores=_load(record["scores"], []),
        completed_at=str(record["completed_at"]) if record["completed_at"] else None,
        topic_summary=_load(record.get("topic_summary"), {}),
        weak_topics=_load(record.get("weak_topics"), []),
        next_review_suggestion=None,
    )


@router.post(
    "/{session_id}/retest",
    response_model=RetestResponse,
    tags=["Retest"],
    summary="Retest — new session from weak areas",
)
async def create_retest(
    session_id: str,
    payload: RetestCreate,
    cache: CacheService = Depends(get_cache),
    db: Database = Depends(get_db),
):
    """Step 6 — Retest: targeted practice on weak areas (score <= 60).

    Defaults to weak-only questions. Pass weak_only=false for a full
    confidence retest. Retests are allowed within 24h of completion —
    otherwise start a fresh session.
    """
    try:
        state, meta = await session_service.create_retest(
            cache,
            db,
            session_id,
            weak_only=payload.weak_only,
            count=payload.count,
        )
    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SessionConflictError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except RetestWindowExpiredError as e:
        raise HTTPException(status_code=410, detail=str(e)) from e
    return RetestResponse(
        id=state["id"],
        parent_session_id=session_id,
        context_id=state["context_id"],
        question_count=len(state["questions"]),
        status=state["status"],
        weak_topics=meta.get("weak_topics", []),
        previous_scores=meta.get("previous_scores", {}),
    )
