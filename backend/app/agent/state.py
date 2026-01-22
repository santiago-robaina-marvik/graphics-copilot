from typing import Annotated, TypedDict, Any
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    dataframe_info: dict[str, Any]  # Column names, types, shape
    session_id: str
