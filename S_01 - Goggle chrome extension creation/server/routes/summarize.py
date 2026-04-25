from fastapi import APIRouter, HTTPException

from server.config import settings
from server.models.schemas import SummarizeRequest, SummarizeResponse
from server.services.text_summarizer import summarize_text

router = APIRouter()


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(payload: SummarizeRequest) -> SummarizeResponse:
    raw = payload.text.strip()
    if len(raw) > settings.max_body_chars:
        raise HTTPException(status_code=413, detail="Page text is too large for this demo backend.")
    if len(raw) < 50:
        raise HTTPException(status_code=400, detail="Need more text to summarize (at least ~50 characters).")

    summary = summarize_text(raw, sentences=payload.sentences)
    if not summary.strip():
        raise HTTPException(status_code=422, detail="Could not produce a summary from the given text.")

    return SummarizeResponse(summary=summary, source_chars=len(raw))
