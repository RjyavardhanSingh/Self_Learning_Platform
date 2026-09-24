"""Session lifecycle service — manage sessions in Dragonfly, persist on complete."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from cache.dragonfly import CacheService
from db.connection import Database


class SessionNotFoundError(ValueError):
    """Raised when a session does not exist."""


class SessionConflictError(ValueError):
    """Raised when a session operation conflicts with its current state."""


class InvalidAnswerError(ValueError):
    """Raised when an answer is invalid for the current question."""


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

    Uses Gemini for semantic scoring when enriched question data is available.
    Supports skipped=true per PRD §9.3 (scored 0, tagged weak).
    Returns the answer record with score and detailed feedback.
    """
    state = cache.get(f"session:{session_id}")
    if state is None:
        raise SessionNotFoundError(f"Session not found: {session_id}")
    if state.get("status") != "active":
        raise SessionConflictError("Session is no longer active")
    if question_index != state.get("current_index", 0):
        raise SessionConflictError("Answers must be submitted one question at a time")
    if _get_question(state, question_index) is None:
        raise InvalidAnswerError("Question index is out of range")
    if not skipped and not answer_text.strip():
        raise InvalidAnswerError("Answer text is required unless skipped=true")

    if skipped:
        score = 0
        feedback = "Skipped"
        concept_coverage = []
        concepts_missed = []
        misconceptions_found = []
    else:
        question = _get_question(state, question_index)
        if question and question.get("reference_answer"):
            result = await _score_with_gemini(question, answer_text)
            score = result["score"]
            feedback = result["feedback"]
            concept_coverage = result["concept_coverage"]
            concepts_missed = result["concepts_missed"]
            misconceptions_found = result["misconceptions_found"]
        else:
            score = _score_answer(answer_text)
            feedback = "Good" if score >= 70 else "Needs work"
            concept_coverage = []
            concepts_missed = []
            misconceptions_found = []

    answer_record = {
        "question_index": question_index,
        "answer_text": answer_text,
        "score": score,
        "feedback": feedback,
        "concept_coverage": concept_coverage,
        "concepts_missed": concepts_missed,
        "misconceptions_found": misconceptions_found,
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
        raise SessionNotFoundError(f"Session not found: {session_id}")
    if state.get("status") != "active":
        raise SessionConflictError("Session is already completed")
    if state.get("current_index", 0) != len(state.get("questions", [])):
        raise SessionConflictError("Answer every question or skip it before completing")

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
        json.dumps(state["questions"]),
        json.dumps(state["answers"]),
        json.dumps(state["scores"]),
        readiness,
        state["started_at"],
        state["completed_at"],
    )

    cache.delete(f"session:{session_id}")
    cache.delete(f"questions:{state['context_id']}")

    return state


def _get_question(state: dict, question_index: int) -> dict | None:
    """Fetch the question dict for a given index."""
    questions = state.get("questions") or []
    if 0 <= question_index < len(questions):
        return questions[question_index]
    return None


async def _score_with_gemini(question: dict, answer_text: str) -> dict:
    """Use OpenRouter to score answer against enriched rubric.

    Returns dict with score, feedback, concept_coverage, concepts_missed,
    misconceptions_found.
    """
    from services.openrouter_service import _call_openrouter

    prompt = (
        "You are an educational scoring assistant. Score the student's answer "
        "against the question's rubric and reference answer.\n\n"
        f"QUESTION: {question['text']}\n\n"
        f"REFERENCE ANSWER: {question.get('reference_answer', '')}\n\n"
        f"SCORING RUBRIC:\n"
        f"- Excellent (90-100): {question.get('scoring_rubric', {}).get('excellent', '')}\n"
        f"- Good (70-89): {question.get('scoring_rubric', {}).get('good', '')}\n"
        f"- Needs work (<70): {question.get('scoring_rubric', {}).get('needs_work', '')}\n\n"
        f"TARGET CONCEPTS: {json.dumps(question.get('target_concepts', []))}\n\n"
        f"REQUIRED RELATIONSHIPS: {json.dumps(question.get('required_relationships', []))}\n\n"
        f"COMMON MISCONCEPTIONS: {json.dumps(question.get('common_misconceptions', []))}\n\n"
        f"STUDENT ANSWER: {answer_text}\n\n"
        "Return ONLY a JSON object:\n"
        '{"score": 0-100, "feedback": "detailed feedback", '
        '"concept_coverage": ["concept1"], "concepts_missed": ["concept2"], '
        '"misconceptions_found": ["misconception1"]}'
    )

    try:
        response_text = await _call_openrouter(prompt)
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        result = json.loads(cleaned)
        score_val = int(result.get("score", 0))
        return {
            "score": max(0, min(100, score_val)),
            "feedback": str(result.get("feedback", "Good" if score_val >= 70 else "Needs work")),
            "concept_coverage": _ensure_list(result.get("concept_coverage")),
            "concepts_missed": _ensure_list(result.get("concepts_missed")),
            "misconceptions_found": _ensure_list(result.get("misconceptions_found")),
        }
    except Exception:
        ref = question.get("reference_answer", "")
        score = _score_against_reference(ref, answer_text) if ref else _score_answer(answer_text)
        return {
            "score": score,
            "feedback": "Good" if score >= 70 else "Needs work",
            "concept_coverage": [],
            "concepts_missed": [],
            "misconceptions_found": [],
        }


def _ensure_list(value: object) -> list[str]:
    """Coerce a value to a list of strings."""
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return []


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

    Fallback scoring when Gemini is unavailable.
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
