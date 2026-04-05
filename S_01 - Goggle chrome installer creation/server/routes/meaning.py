from fastapi import APIRouter, HTTPException

from server.models.schemas import MeaningRequest, MeaningResponse
from server.services.dictionary_service import lookup_dictionary
from server.services.wikipedia_service import lookup_wikipedia_summary

router = APIRouter()


@router.post("/meaning", response_model=MeaningResponse)
async def meaning(payload: MeaningRequest) -> MeaningResponse:
    text = payload.text.strip()
    got = await lookup_dictionary(text)
    if got:
        title, defs = got
        return MeaningResponse(title=title, definitions=defs, source="Free Dictionary API")

    got_w = await lookup_wikipedia_summary(text)
    if got_w:
        title, defs = got_w
        return MeaningResponse(title=title, definitions=defs, source="Wikipedia (summary)")

    raise HTTPException(
        status_code=404,
        detail="No definition found. Try a single English word or a well-known topic title.",
    )
