"""Practice — realtime speech-to-text token (ElevenLabs Scribe)."""

from fastapi import APIRouter, HTTPException

from api.schemas import SttTokenResponse
from services import stt_service
from services.stt_service import STTNotConfiguredError, STTProviderError

router = APIRouter(prefix="/stt", tags=["Practice"])


@router.get(
    "/token",
    response_model=SttTokenResponse,
    summary="Practice — mint realtime transcription token",
)
async def mint_stt_token():
    """Mint a short-lived ElevenLabs token for browser-direct transcription."""
    try:
        result = await stt_service.mint_realtime_token()
    except STTNotConfiguredError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except STTProviderError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return SttTokenResponse(**result)
