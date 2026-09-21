import pytest

from api.schemas import QuestionResponse
from services import openrouter_service as ors
from services import session_service


def test_prompt_requests_reference_answer():
    prompt = ors._build_prompt("some material", {"subject": "bio"}, 5)

    assert "reference answer" in prompt.lower()
    assert '"answer"' in prompt


def test_normalize_questions_ok():
    raw = [{"text": " What is X? ", "topic": " Basics ", "answer": " X is Y. "}]

    assert ors._normalize_questions(raw) == [
        {"text": "What is X?", "topic": "Basics", "answer": "X is Y."}
    ]


def test_normalize_questions_missing_answer_tolerated():
    assert ors._normalize_questions([{"text": "Q?", "topic": "T"}])[0]["answer"] == ""


@pytest.mark.parametrize("raw", [[], {}, "nope", [{"topic": "no text"}], [{"text": "   "}]])
def test_normalize_questions_rejects_unusable(raw):
    with pytest.raises(ValueError):
        ors._normalize_questions(raw)


def test_score_perfect_answer_is_100():
    ref = "Photosynthesis converts carbon dioxide and water into glucose using sunlight."

    assert session_service._score_against_reference(ref, ref) == 100


def test_score_empty_answer_is_0():
    assert session_service._score_against_reference("Mitochondria produce energy.", "  ") == 0


def test_score_partial_beats_irrelevant():
    ref = "Mitochondria produce ATP through cellular respiration using oxygen and glucose."
    partial = "Mitochondria make ATP using glucose."
    irrelevant = "The capital city has many beautiful museums and parks."

    assert session_service._score_against_reference(
        ref, partial
    ) > session_service._score_against_reference(ref, irrelevant)


def test_question_response_carries_answer():
    q = QuestionResponse(text="Q?", topic="T", answer="A.")

    assert q.answer == "A."


class _FakeCache:
    def __init__(self, state):
        self.state = state

    def get(self, key):
        return self.state

    def set(self, key, value, ttl=None):
        self.state = value


def test_submit_answer_scores_against_reference():
    import asyncio

    question = {
        "text": "What do mitochondria produce?",
        "topic": "Cells",
        "answer": "Mitochondria produce ATP through cellular respiration.",
    }
    cache = _FakeCache(
        {
            "id": "s1",
            "context_id": "c1",
            "questions": [question],
            "answers": [],
            "scores": [],
            "current_index": 0,
            "status": "active",
        }
    )

    record = asyncio.run(
        session_service.submit_answer(
            cache, "s1", 0, "Mitochondria produce ATP through cellular respiration."
        )
    )

    assert record["score"] == 100
    assert record["feedback"] == "Good"


def test_submit_answer_falls_back_without_reference():
    import asyncio

    cache = _FakeCache(
        {
            "id": "s1",
            "context_id": "c1",
            "questions": [{"text": "Q?", "topic": "T"}],
            "answers": [],
            "scores": [],
            "current_index": 0,
            "status": "active",
        }
    )

    record = asyncio.run(
        session_service.submit_answer(cache, "s1", 0, "a fairly long answer " * 10)
    )

    assert record["score"] == session_service._score_answer("a fairly long answer " * 10)
