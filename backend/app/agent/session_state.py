"""Per-session mutable state registry.

Replaces module-level globals in dataframe.py and themes.py with a
dict keyed by session_id. Each session gets its own DataFrame,
original DataFrame, data source, and theme.
"""

from dataclasses import dataclass

import pandas as pd


@dataclass
class SessionState:
    """Mutable state for a single user session."""

    current_df: pd.DataFrame | None = None
    original_df: pd.DataFrame | None = None
    data_source: dict | None = None
    theme: str = "meli_dark"


_sessions: dict[str, SessionState] = {}


def get_session(session_id: str) -> SessionState:
    """Get or create session state for the given session_id."""
    if session_id not in _sessions:
        _sessions[session_id] = SessionState()
    return _sessions[session_id]


def remove_session(session_id: str) -> bool:
    """Remove a session's state. Returns True if it existed."""
    return _sessions.pop(session_id, None) is not None


def clear_all_sessions() -> None:
    """Remove all sessions. Used in tests."""
    _sessions.clear()
