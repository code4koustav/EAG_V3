from pydantic import BaseModel, Field


class MeaningRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class MeaningResponse(BaseModel):
    title: str
    definitions: list[str]
    source: str


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=500_000)
    sentences: int | None = Field(default=None, ge=1, le=20)


class SummarizeResponse(BaseModel):
    summary: str
    source_chars: int
