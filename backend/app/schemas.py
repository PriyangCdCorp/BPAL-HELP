from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = Field(default=None, min_length=1, max_length=80)
    top_k: int | None = Field(default=None, ge=1, le=20)
    # Retained for compatibility with clients that already send conversation history.
    history: list[dict[str, str]] = Field(default_factory=list, max_length=12)


class SourceItem(BaseModel):
    source_id: str
    document_id: str
    filename: str
    chunk_index: int
    heading: str | None
    content: str
    similarity: float


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    sources: list[SourceItem]
    retrieval_count: int
    model_provider: str
