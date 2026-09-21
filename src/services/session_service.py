"""Session lifecycle service — manage sessions in Dragonfly, persist on complete."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from cache.dragonfly import CacheService
from db.connection import Database


async def create_session(cache: CacheService, context_id: str, questions: list[dict]) -> dict:
    """Start a new session. Stores state in Dragonfly."""
    session_id = uuid.uuid4().hex[:16]
    state = {
        "id": session_id,
        "context_id": context_id,
        "questions": questions,
        "answers": [],
        "scores": [],
        "current_index": 0,
        "status": "active",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    cache.set(f"session:{session_id}", state, ttl=86400)
    return state


async def get_session(cache: CacheService, session_id: str) -> dict | None:
    """Get session state from Dragonfly."""
    return cache.get(f"session:{session_id}")


async def submit_answer(
    cache: CacheService,
    session_id: str,
    question_index: int,
    answer_text: str,
    skipped: bool = False,
) -> dict:
    """Record an answer for a question. Updates session in Dragonfly.

    Supports skipped=true per PRD §9.3 (scored 0, tagged weak).
    Returns the answer record with score.
    """
    state = cache.get(f"session:{session_id}")
    if state is None:
        raise ValueError(f"Session not found: {session_id}")

    if skipped:
        score = 0
    else:
        reference = _reference_answer(state, question_index)
        if reference:
            score = _score_against_reference(reference, answer_text)
        else:
            score = _score_answer(answer_text)
    feedback = "Good" if score >= 70 else "Needs work"

    answer_record = {
        "question_index": question_index,
        "answer_text": answer_text,
        "score": score,
        "feedback": feedback,
    }
    if skipped:
        answer_record["skipped"] = True

    state["answers"].append(answer_record)
    state["scores"].append({"question_index": question_index, "score": score})
    state["current_index"] = question_index + 1

    cache.set(f"session:{session_id}", state, ttl=86400)

    return answer_record


async def complete_session(
    cache: CacheService,
    db: Database,
    session_id: str,
) -> dict:
    """Complete a session: compute final score, write to DB, clear cache.

    Returns the completed session record.
    """
    state = cache.get(f"session:{session_id}")
    if state is None:
        raise ValueError(f"Session not found: {session_id}")

    scores = state.get("scores", [])
    if scores:
        readiness = round(sum(s["score"] for s in scores) / len(scores))
    else:
        readiness = 0

    state["status"] = "completed"
    state["readiness_score"] = readiness
    state["completed_at"] = datetime.now(timezone.utc).isoformat()

    await db.execute(
        """INSERT INTO sessions (id, context_id, questions, answers, scores,
              readiness_score, started_at, completed_at)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8)""",
        state["id"],
        state["context_id"],
        __import__("json").dumps(state["questions"]),
        __import__("json").dumps(state["answers"]),
        __import__("json").dumps(state["scores"]),
        readiness,
        state["started_at"],
        state["completed_at"],
    )

    cache.delete(f"session:{session_id}")
    cache.delete(f"questions:{state['context_id']}")

    return state


def _reference_answer(state: dict, question_index: int) -> str:
    """Fetch the perfect reference answer for a question, if the session has one."""
    questions = state.get("questions") or []
    if 0 <= question_index < len(questions):
        answer = (questions[question_index] or {}).get("answer")
        if isinstance(answer, str) and answer.strip():
            return answer
    return ""


_STOPWORDS = frozenset(
    """
    a an the and or but if then else when while of at by for with about into
    through during before after above below to from up down in out on off over
    under again further once here there all any both each few more most other
    some such no nor not only own same so than too very can will just should
    now is are was were be been being have has had having do does did doing
    would could ought i you he she it we they them his her its our their this
    that these those as it s t
    """.split()
)


def _keywords(text: str) -> set[str]:
    """Content-bearing tokens used for answer comparison."""
    import re

    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return {t for t in tokens if len(t) >= 3 and t not in _STOPWORDS}


def _score_against_reference(reference: str, answer_text: str) -> int:
    """Score a learner answer by keyword coverage of the reference answer.

    Recall-heavy: a full-marks answer must contain the reference's key
    facts/terms. Precision contributes a smaller share so concise correct
    answers score well while keyword-stuffed rambling is tempered.
    Returns 0-100.
    """
    ref_keys = _keywords(reference)
    if not ref_keys:
        return _score_answer(answer_text)
    ans_keys = _keywords(answer_text)
    if not ans_keys:
        return 0
    overlap = ref_keys & ans_keys
    recall = len(overlap) / len(ref_keys)
    precision = len(overlap) / len(ans_keys)
    return max(0, min(100, round(100 * (0.8 * recall + 0.2 * precision))))


def _score_answer(answer_text: str) -> int:
    """Placeholder scoring — returns a deterministic score based on length."""
    length = len(answer_text.strip())
    if length == 0:
        return 0
    if length < 20:
        return 30
    if length < 50:
        return 50
    if length < 100:
        return 70
    if length < 200:
        return 85
    return 95
