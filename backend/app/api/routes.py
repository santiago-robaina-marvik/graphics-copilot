import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage
import re

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    RegenerateRequest,
    RegenerateResponse,
    DeleteChartResponse,
    TrashItem,
    TrashListResponse,
    RestoreChartResponse,
    ComposeLayoutRequest,
    UploadChartResponse,
)
from app.agent.graph import get_agent
from app.agent.tools.dataframe import set_dataframe, set_data_source
from app.services.sheets import fetch_public_sheet, SheetFetchError
from app.agent.tools.plotting import (
    create_bar_chart,
    create_line_chart,
    create_distribution_chart,
    create_area_chart,
)
from app.agent.tools.themes import set_theme
from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger("app.api.routes")

router = APIRouter()


def _read_chart_metadata(chart_url: str) -> dict | None:
    """Read metadata from JSON sidecar file for a chart."""
    if not chart_url:
        return None
    try:
        settings = get_settings()
        # chart_url is like "/static/charts/chart_xxx.png"
        filename = Path(chart_url).name.replace(".png", ".json")
        json_path = Path(settings.charts_dir) / filename
        if json_path.exists():
            with open(json_path) as f:
                return json.load(f)
    except Exception:
        pass
    return None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the chart agent.
    Optionally include data as a list of dictionaries (DataFrame rows).
    """
    logger.info("━━━ New chat request ━━━")
    logger.info(f"Session: {request.session_id}")
    logger.info(f"Message: {request.message[:100]}{'...' if len(request.message) > 100 else ''}")

    try:
        # Fetch fresh data from Google Sheets if sheet source provided
        if request.sheet_id:
            try:
                logger.info(f"Fetching fresh data from sheet: {request.sheet_id}")
                fresh_data = fetch_public_sheet(request.sheet_id, request.sheet_gid or "0")
                set_dataframe(fresh_data)
                set_data_source(
                    {
                        "type": "google_sheets",
                        "sheet_id": request.sheet_id,
                        "sheet_gid": request.sheet_gid or "0",
                    }
                )
                logger.info(f"Loaded {len(fresh_data)} rows from Google Sheet")
            except SheetFetchError as e:
                logger.warning(f"Sheet fetch failed, using cached data: {e}")
                # Fall back to provided data if sheet fetch fails
                if request.data:
                    logger.info(f"Falling back to provided data: {len(request.data)} rows")
                    set_dataframe(request.data)
                    set_data_source(None)  # Clear data source since using cached
        elif request.data:
            # No sheet source, use provided data
            logger.info(f"Data provided: {len(request.data)} rows")
            set_dataframe(request.data)
            set_data_source(None)  # No sheet source

        # Set the chart theme
        theme_name = request.theme or "meli_dark"
        set_theme(theme_name)
        logger.info(f"Chart theme: {theme_name}")

        # Get the agent
        agent = get_agent()

        # Configure session
        config = {"configurable": {"thread_id": request.session_id}}

        # Invoke the agent
        logger.info("Invoking agent...")
        result = agent.invoke({"messages": [HumanMessage(content=request.message)]}, config=config)

        # Extract the response
        messages = result["messages"]
        last_message = messages[-1]

        # Handle content that might be a list of blocks or a string
        content = last_message.content
        if isinstance(content, list):
            # Extract text from content blocks
            response_text = ""
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    response_text += block.get("text", "")
                elif isinstance(block, str):
                    response_text += block
            response_text = response_text.strip() or "Chart generated successfully."
        else:
            response_text = content

        # Strip markdown image syntax from response since charts are displayed separately
        response_text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", response_text).strip()

        # Check if a chart was generated (look for chart URL in tool results)
        chart_url = None
        for msg in reversed(messages):
            if hasattr(msg, "content") and "/static/charts/" in str(msg.content):
                # Extract the URL from the message
                match = re.search(r'/static/charts/[^\s"\'\.,\)]+\.png', str(msg.content))
                if match:
                    chart_url = match.group(0)
                    break

        logger.info(f"Response: {response_text[:100]}{'...' if len(response_text) > 100 else ''}")
        if chart_url:
            logger.info(f"Chart generated: {chart_url}")
        logger.info("━━━ Request complete ━━━\n")

        # Get chart metadata from sidecar file if a chart was generated
        chart_metadata = _read_chart_metadata(chart_url)

        return ChatResponse(
            response=response_text,
            chart_url=chart_url,
            chart_metadata=chart_metadata,
            session_id=request.session_id,
        )

    except Exception as e:
        logger.error(f"Error in chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset/{session_id}")
async def reset_session(session_id: str):
    """Reset a chat session (clear conversation history)."""
    # The MemorySaver doesn't have a direct delete method,
    # but starting a new thread_id effectively creates a new session
    return {
        "status": "ok",
        "message": f"Session {session_id} will be reset on next message",
    }


@router.get("/sessions/{session_id}/history")
async def get_history(session_id: str):
    """Get conversation history for a session."""
    agent = get_agent()
    config = {"configurable": {"thread_id": session_id}}

    try:
        state = agent.get_state(config)
        messages = state.values.get("messages", [])

        history = []
        for msg in messages:
            history.append(
                {
                    "role": msg.__class__.__name__.replace("Message", "").lower(),
                    "content": msg.content,
                }
            )

        return {"session_id": session_id, "history": history}
    except Exception:
        return {"session_id": session_id, "history": []}


@router.post("/regenerate", response_model=RegenerateResponse)
async def regenerate_chart(request: RegenerateRequest):
    """Regenerate a chart with specified parameters, optionally fetching fresh data."""
    # Fetch fresh data from Google Sheets if sheet source provided
    if request.sheet_id:
        try:
            logger.info(f"Fetching fresh data from sheet: {request.sheet_id}")
            fresh_data = fetch_public_sheet(request.sheet_id, request.sheet_gid or "0")
            set_dataframe(fresh_data)
            set_data_source(
                {
                    "type": "google_sheets",
                    "sheet_id": request.sheet_id,
                    "sheet_gid": request.sheet_gid or "0",
                }
            )
            logger.info(f"Loaded {len(fresh_data)} rows from Google Sheet")
        except SheetFetchError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Set theme
    set_theme(request.theme or "meli_dark")

    # Call appropriate chart function based on type
    chart_functions = {
        "bar": lambda: create_bar_chart.invoke(
            {
                "x_column": request.x_column,
                "y_column": request.y_column,
                "title": request.title or "Bar Chart",
            }
        ),
        "line": lambda: create_line_chart.invoke(
            {
                "x_column": request.x_column,
                "y_column": request.y_column,
                "title": request.title or "Line Chart",
            }
        ),
        "distribution": lambda: create_distribution_chart.invoke(
            {
                "labels_column": request.labels_column,
                "values_column": request.values_column,
                "title": request.title or "Distribution Chart",
            }
        ),
        "area": lambda: create_area_chart.invoke(
            {
                "x_column": request.x_column,
                "y_column": request.y_column,
                "title": request.title or "Area Chart",
            }
        ),
    }

    if request.chart_type not in chart_functions:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown chart type: {request.chart_type}. Valid types: {list(chart_functions.keys())}",
        )

    # Generate the chart
    result = chart_functions[request.chart_type]()

    # Check for errors
    if "not found" in result.lower() or "no data" in result.lower():
        raise HTTPException(status_code=400, detail=result)

    # Extract chart URL from result string
    match = re.search(r"/static/charts/[^\s\"']+\.png", result)
    if not match:
        raise HTTPException(status_code=500, detail="Failed to extract chart URL")

    chart_url = match.group(0)

    # Read metadata from JSON sidecar file
    metadata = _read_chart_metadata(chart_url)
    if not metadata:
        raise HTTPException(status_code=500, detail="Failed to read chart metadata")

    return RegenerateResponse(
        chart_url=chart_url,
        chart_metadata=metadata,
    )


def _get_trash_dir() -> Path:
    """Ensure trash directory exists and return its path."""
    settings = get_settings()
    trash_path = Path(settings.trash_dir)
    trash_path.mkdir(parents=True, exist_ok=True)
    return trash_path


def _purge_expired_trash() -> int:
    """Delete items older than retention period, return count of purged items."""
    settings = get_settings()
    trash_path = _get_trash_dir()
    retention_days = settings.trash_retention_days
    cutoff = datetime.now() - timedelta(days=retention_days)
    purged_count = 0

    for json_file in trash_path.glob("*.json"):
        try:
            with open(json_file) as f:
                metadata = json.load(f)
            deleted_at_str = metadata.get("deleted_at")
            if deleted_at_str:
                deleted_at = datetime.fromisoformat(deleted_at_str)
                if deleted_at < cutoff:
                    # Delete both JSON and PNG
                    png_file = json_file.with_suffix(".png")
                    json_file.unlink(missing_ok=True)
                    if png_file.exists():
                        png_file.unlink()
                    purged_count += 1
        except (json.JSONDecodeError, ValueError, OSError):
            # Skip malformed files
            continue

    return purged_count


def _validate_chart_filename(filename: str) -> None:
    """Validate chart filename for security."""
    if not filename.startswith("chart_"):
        raise HTTPException(status_code=400, detail="Invalid chart filename")
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename: path traversal not allowed")


@router.delete("/charts/{filename}", response_model=DeleteChartResponse)
async def delete_chart(filename: str):
    """Move a chart to trash (soft delete)."""
    _validate_chart_filename(filename)

    settings = get_settings()
    charts_path = Path(settings.charts_dir)
    trash_path = _get_trash_dir()

    # Handle filename with or without extension
    base_filename = filename.replace(".png", "").replace(".json", "")
    png_file = charts_path / f"{base_filename}.png"
    json_file = charts_path / f"{base_filename}.json"

    if not png_file.exists():
        raise HTTPException(status_code=404, detail=f"Chart not found: {filename}")

    # Read existing metadata
    metadata = {}
    if json_file.exists():
        try:
            with open(json_file) as f:
                metadata = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    # Add deletion timestamp
    deleted_at = datetime.now()
    metadata["deleted_at"] = deleted_at.isoformat()

    # Move files to trash
    trash_png = trash_path / f"{base_filename}.png"
    trash_json = trash_path / f"{base_filename}.json"

    try:
        png_file.rename(trash_png)
        with open(trash_json, "w") as f:
            json.dump(metadata, f, indent=2)
        if json_file.exists():
            json_file.unlink()
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to move chart to trash: {e}")

    logger.info(f"Chart moved to trash: {base_filename}")

    return DeleteChartResponse(
        success=True,
        message="Chart moved to trash",
        filename=f"{base_filename}.png",
    )


@router.get("/charts/trash", response_model=TrashListResponse)
async def list_trash():
    """List charts in trash, purging expired items first."""
    settings = get_settings()
    trash_path = _get_trash_dir()

    # Purge expired items first
    purged_count = _purge_expired_trash()

    # List remaining items
    items = []
    retention_days = settings.trash_retention_days

    for json_file in trash_path.glob("*.json"):
        try:
            with open(json_file) as f:
                metadata = json.load(f)

            deleted_at_str = metadata.get("deleted_at")
            if not deleted_at_str:
                continue

            deleted_at = datetime.fromisoformat(deleted_at_str)
            expires_at = deleted_at + timedelta(days=retention_days)

            # Remove deleted_at from metadata shown to user
            user_metadata = {k: v for k, v in metadata.items() if k != "deleted_at"}

            items.append(
                TrashItem(
                    filename=json_file.stem + ".png",
                    deleted_at=deleted_at_str,
                    expires_at=expires_at.isoformat(),
                    metadata=user_metadata if user_metadata else None,
                )
            )
        except (json.JSONDecodeError, ValueError, OSError):
            continue

    # Sort by deletion date (newest first)
    items.sort(key=lambda x: x.deleted_at, reverse=True)

    return TrashListResponse(items=items, purged_count=purged_count)


@router.post("/charts/trash/{filename}/restore", response_model=RestoreChartResponse)
async def restore_chart(filename: str):
    """Restore a chart from trash."""
    _validate_chart_filename(filename)

    settings = get_settings()
    charts_path = Path(settings.charts_dir)
    trash_path = _get_trash_dir()

    # Handle filename with or without extension
    base_filename = filename.replace(".png", "").replace(".json", "")
    trash_png = trash_path / f"{base_filename}.png"
    trash_json = trash_path / f"{base_filename}.json"

    if not trash_png.exists():
        raise HTTPException(status_code=404, detail=f"Chart not found in trash: {filename}")

    # Read metadata
    metadata = {}
    if trash_json.exists():
        try:
            with open(trash_json) as f:
                metadata = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    # Remove deleted_at from metadata
    metadata.pop("deleted_at", None)

    # Move files back to charts directory
    restored_png = charts_path / f"{base_filename}.png"
    restored_json = charts_path / f"{base_filename}.json"

    try:
        trash_png.rename(restored_png)
        if metadata:
            with open(restored_json, "w") as f:
                json.dump(metadata, f, indent=2)
        trash_json.unlink(missing_ok=True)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore chart: {e}")

    logger.info(f"Chart restored from trash: {base_filename}")

    chart_url = f"/static/charts/{base_filename}.png"

    return RestoreChartResponse(
        success=True,
        message="Chart restored successfully",
        chart_url=chart_url,
        chart_metadata=metadata if metadata else None,
    )


@router.post("/charts/compose-layout", response_model=UploadChartResponse)
async def compose_layout_endpoint(request: ComposeLayoutRequest):
    """Compose multiple charts into a layout image."""
    import time

    from app.utils.layout_composer import (
        VALID_LAYOUT_TYPES,
        compose_layout,
        get_slot_count,
    )

    # Validate layout type
    if request.layout_type not in VALID_LAYOUT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid layout type: {request.layout_type}. Valid types: {VALID_LAYOUT_TYPES}",
        )

    # Validate slot count
    expected_slots = get_slot_count(request.layout_type)
    if len(request.chart_filenames) != expected_slots:
        raise HTTPException(
            status_code=400,
            detail=f"Layout '{request.layout_type}' requires {expected_slots} "
            f"charts, got {len(request.chart_filenames)}",
        )

    settings = get_settings()
    charts_path = Path(settings.charts_dir)

    # Validate chart filenames and resolve paths
    chart_paths = []
    for filename in request.chart_filenames:
        # Security: validate filename format
        if not filename.startswith("chart_") or "/" in filename or "\\" in filename or ".." in filename:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid chart filename: {filename}",
            )
        path = charts_path / f"{filename}.png"
        if not path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Chart not found: {filename}",
            )
        chart_paths.append(path)

    # Compose layout image
    try:
        composed = compose_layout(request.layout_type, chart_paths)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compose layout: {e}",
        )

    # Save composed image
    timestamp = int(time.time() * 1000)
    filename = f"chart_layout_{timestamp}"
    png_path = charts_path / f"{filename}.png"
    json_path = charts_path / f"{filename}.json"

    charts_path.mkdir(parents=True, exist_ok=True)

    try:
        composed.save(png_path, "PNG")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")

    # Save metadata
    metadata = {
        "chart_type": "layout",
        "layout_type": request.layout_type,
        "source": "template_editor",
        "composed_from": request.chart_filenames,
        "created_at": datetime.now().isoformat(),
    }

    try:
        with open(json_path, "w") as f:
            json.dump(metadata, f, indent=2)
    except OSError as e:
        png_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to save metadata: {e}")

    chart_url = f"/static/charts/{filename}.png"
    logger.info(f"Composed layout chart: {filename}")

    return UploadChartResponse(
        success=True,
        chart_url=chart_url,
        chart_metadata=metadata,
    )
