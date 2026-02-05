from pydantic import BaseModel
from typing import Optional, Any, Literal


class ChatRequest(BaseModel):
    message: str
    session_id: str
    data: Optional[list[dict[str, Any]]] = None  # DataFrame as list of dicts
    theme: Optional[Literal["meli_dark", "meli_light", "meli_yellow"]] = "meli_dark"
    # Google Sheets source for fresh data fetching
    sheet_id: Optional[str] = None
    sheet_gid: Optional[str] = "0"


class ChatResponse(BaseModel):
    response: str
    chart_url: Optional[str] = None
    chart_metadata: Optional[dict[str, Any]] = None
    session_id: str


class RegenerateRequest(BaseModel):
    chart_type: str
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    labels_column: Optional[str] = None
    values_column: Optional[str] = None
    title: Optional[str] = None
    theme: Optional[Literal["meli_dark", "meli_light", "meli_yellow"]] = "meli_dark"
    # Google Sheets source for fresh data fetching
    sheet_id: Optional[str] = None
    sheet_gid: Optional[str] = "0"


class RegenerateResponse(BaseModel):
    chart_url: str
    chart_metadata: dict[str, Any]


class TrashItem(BaseModel):
    filename: str
    deleted_at: str
    expires_at: str
    metadata: Optional[dict[str, Any]] = None


class TrashListResponse(BaseModel):
    items: list[TrashItem]
    purged_count: int


class DeleteChartResponse(BaseModel):
    success: bool
    message: str
    filename: str


class RestoreChartResponse(BaseModel):
    success: bool
    message: str
    chart_url: str
    chart_metadata: Optional[dict[str, Any]] = None


class UploadChartRequest(BaseModel):
    image_data: str  # Base64 encoded PNG (with or without data URL prefix)
    layout_type: str  # e.g., "grid", "half-left", "split-horizontal"


class UploadChartResponse(BaseModel):
    success: bool
    chart_url: str
    chart_metadata: dict[str, Any]
