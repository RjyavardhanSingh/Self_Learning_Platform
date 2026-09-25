"""ElevenLabs realtime STT (Scribe v2 Realtime) single-use tokens.

The browser talks directly to ElevenLabs over WebSocket using a short-lived
token minted here, so ELEVENLABS_API_KEY never leaves the server.
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

TOKEN_URL = "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe"
TOKEN_TTL_SECONDS = 15 * 60  # single-use tokens expire after 15 minutes


class STTNotConfiguredError(RuntimeError):
    """Raised when ELEVENLABS_API_KEY is missing."""


class STTProviderError(RuntimeError):
    """Raised when ElevenLabs rejects the token request."""


def _get_api_key() -> str:
    """Read the ElevenLabs API key from env."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise STTNotConfiguredError(
            "ELEVENLABS_API_KEY is not set. Add it to your backend .env file."
        )
    return api_key


async def mint_realtime_token() -> dict:
    """Mint a single-use token for browser-direct Scribe realtime sessions."""
    api_key = _get_api_key()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(TOKEN_URL, headers={"xi-api-key": api_key})
    if resp.status_code != 200:
        logger.warning(f"ElevenLabs token request failed: {resp.status_code}")
        raise STTProviderError("Speech transcription is temporarily unavailable")
    try:
        token = resp.json().get("token", "")
    except ValueError as e:
        raise STTProviderError("Speech transcription is temporarily unavailable") from e
    if not token:
        raise STTProviderError("Speech transcription is temporarily unavailable")
    return {"token": token, "expires_in": TOKEN_TTL_SECONDS}
