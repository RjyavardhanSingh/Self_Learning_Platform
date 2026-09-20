"""Gemini service for question generation."""

from __future__ import annotations

import asyncio
import json
import logging

from google import genai
from google.genai import types

from cache.dragonfly import CacheService

logger = logging.getLogger(__name__)

MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"]
THINKING_LEVEL = "medium"
RETRY_DELAYS = [3, 10, 20]
MAX_INPUT_TOKENS = 800000  # Leave room for prompt template + output


def _get_client() -> genai.Client:
    """Create Gemini client using API key from env."""
    return genai.Client()


def calculate_question_count(word_count: int) -> int:
    """Dynamic question count based on content length."""
    if word_count < 2000:
        return 5
    elif word_count < 10000:
        return 10
    elif word_count < 50000:
        return 15
    else:
        return 20


def _truncate_content(content: str, max_chars: int = 3000000) -> str:
    """Truncate content to stay within token limits.

    Rough estimate: 1 token ≈ 4 chars for English text.
    800K tokens ≈ 3.2M chars. We use 3M chars to be safe.
    """
    if len(content) <= max_chars:
        return content
    logger.warning(
        f"Truncating material content from {len(content)} to {max_chars} chars"
    )
    return content[:max_chars]


def _build_prompt(material_content: str, goal: dict, count: int) -> str:
    """Build prompt for Gemini."""
    subject = goal.get("subject", "general")
    target = goal.get("target", "general understanding")
    level = goal.get("level", "intermediate")

    return (
        "You are a learning assistant. Generate practice questions "
        "based on the following material and learning goal.\n\n"
        f"MATERIAL:\n{material_content}\n\n"
        f"LEARNING GOAL:\n"
        f"- Subject: {subject}\n"
        f"- Target: {target}\n"
        f"- Level: {level}\n\n"
        f"Generate {count} questions that:\n"
        "1. Are directly about the material content (no unrelated questions)\n"
        "2. Test understanding, not just memorization\n"
        "3. Match the difficulty to the learner's level\n"
        "4. Cover different topics from the material\n\n"
        'Return ONLY a JSON array, no other text:\n'
        '[{{"text": "question text", "topic": "topic name"}}]'
    )


async def _call_gemini(prompt: str) -> str:
    """Call Gemini API with fallback models (sync wrapper for async context)."""

    def _sync_call(model: str):
        client = _get_client()
        config = None
        if model == "gemini-3.8-flash":
            config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level=THINKING_LEVEL
                )
            )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text

    loop = asyncio.get_event_loop()
    last_error = None
    for model in MODELS:
        try:
            return await loop.run_in_executor(None, _sync_call, model)
        except Exception as e:
            last_error = e
            logger.warning(f"Gemini model {model} failed: {e}")
    raise last_error


async def generate_questions(
    cache: CacheService,
    context_id: str,
    material_content: str,
    goal: dict,
    word_count: int,
) -> list[dict]:
    """Generate questions using Gemini with retry logic.

    Checks Gemini response cache first to avoid re-generation.
    """
    cache_key = f"gemini_response:{context_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        logger.info(f"Gemini cache hit for context {context_id}")
        return cached

    count = calculate_question_count(word_count)
    truncated_content = _truncate_content(material_content)
    prompt = _build_prompt(truncated_content, goal, count)

    last_error = None
    for delay in RETRY_DELAYS:
        try:
            response_text = await _call_gemini(prompt)
            # Strip markdown code fences if present
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            questions = json.loads(cleaned)
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")

            cache.set(cache_key, questions, ttl=86400)
            return questions

        except Exception as e:
            last_error = e
            logger.warning(f"Gemini call failed: {e}, retrying in {delay}s")
            await asyncio.sleep(delay)

    logger.error(f"Gemini failed after all retries: {last_error}")
    raise RuntimeError("Something went wrong, try again")
