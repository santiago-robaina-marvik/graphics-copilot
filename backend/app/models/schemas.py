from pydantic import BaseModel
from typing import Optional, Any


class ChatRequest(BaseModel):
    message: str
    session_id: str
    data: Optional[list[dict[str, Any]]] = None  # DataFrame as list of dicts


class ChatResponse(BaseModel):
    response: str
    chart_url: Optional[str] = None
    session_id: str
