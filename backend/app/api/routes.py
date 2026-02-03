from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage
import re

from app.models.schemas import ChatRequest, ChatResponse
from app.agent.graph import get_agent
from app.agent.tools.dataframe import set_dataframe
from app.agent.tools.themes import set_theme
from app.logging_config import get_logger

logger = get_logger("app.api.routes")

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the chart agent.
    Optionally include data as a list of dictionaries (DataFrame rows).
    """
    logger.info("━━━ New chat request ━━━")
    logger.info(f"Session: {request.session_id}")
    logger.info(
        f"Message: {request.message[:100]}{'...' if len(request.message) > 100 else ''}"
    )

    try:
        # Set the DataFrame if data is provided
        if request.data:
            logger.info(f"Data provided: {len(request.data)} rows")
            set_dataframe(request.data)

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
        result = agent.invoke(
            {"messages": [HumanMessage(content=request.message)]}, config=config
        )

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

        # Check if a chart was generated (look for chart URL in tool results)
        chart_url = None
        for msg in reversed(messages):
            if hasattr(msg, "content") and "/static/charts/" in str(msg.content):
                # Extract the URL from the message
                match = re.search(
                    r'/static/charts/[^\s"\'\.,\)]+\.png', str(msg.content)
                )
                if match:
                    chart_url = match.group(0)
                    break

        logger.info(
            f"Response: {response_text[:100]}{'...' if len(response_text) > 100 else ''}"
        )
        if chart_url:
            logger.info(f"Chart generated: {chart_url}")
        logger.info("━━━ Request complete ━━━\n")

        return ChatResponse(
            response=response_text, chart_url=chart_url, session_id=request.session_id
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
