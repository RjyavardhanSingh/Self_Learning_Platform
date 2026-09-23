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
from services.session_service import InvalidAnswerError, SessionConflictError, SessionNotFoundError

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
):
    """Step 4 — Practice: submit answer (supports skipped=true per PRD §9.3)."""
    try:
        record = await session_service.submit_answer(
            cache, session_id, payload.question_index, payload.answer_text, skipped=payload.skipped
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
        )
    # DB fallback
    row = await db.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Results not found")
    import json as _json

    def _load(v):
        return _json.loads(v) if isinstance(v, str) else (v or [])

    return SessionResultsResponse(
        id=row["id"],
        readiness_score=row["readiness_score"] or 0,
        questions=_load(row["questions"]),
        answers=_load(row["answers"]),
        scores=_load(row["scores"]),
        completed_at=str(row["completed_at"]) if row["completed_at"] else None,
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
    """Step 6 — Retest: one-tap targeted practice (new session from parent)."""
    # Try cache first
    parent = await session_service.get_session(cache, session_id)
    if parent is None:
        row = await db.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Parent session not found")
        if not row["completed_at"]:
            raise HTTPException(
                status_code=409, detail="Complete the parent session before retesting"
            )
        import json as _json

        def _load(v):
            return _json.loads(v) if isinstance(v, str) else (v or [])

        parent = {
            "id": row["id"],
            "context_id": row["context_id"],
            "questions": _load(row["questions"]),
        }
    if parent.get("status", "completed") != "completed":
        raise HTTPException(status_code=409, detail="Complete the parent session before retesting")
    # Retest: slice parent questions (LLM will filter weak topics later)
    context_id = parent["context_id"]
    questions = parent.get("questions") or await question_service.get_questions(cache, context_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions for retest")
    retest_qs = questions[: payload.count]
    state = await session_service.create_session(cache, context_id, retest_qs)
    return RetestResponse(
        id=state["id"],
        parent_session_id=session_id,
        context_id=context_id,
        question_count=len(retest_qs),
        status=state["status"],
    )
