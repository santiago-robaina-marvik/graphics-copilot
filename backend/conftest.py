"""Pytest configuration and fixtures for backend tests."""

import pytest
import pandas as pd
from unittest.mock import MagicMock, patch

from app.main import app

TEST_SESSION_ID = "test-session"


@pytest.fixture
def client():
    """Create a test client for Flask app."""
    app.config["TESTING"] = True
    return app.test_client()


@pytest.fixture
def sample_dataframe():
    """Create a sample DataFrame for testing."""
    return pd.DataFrame(
        {
            "Product": ["A", "B", "C", "D", "E"],
            "Revenue": [1000, 2500, 1500, 3000, 2000],
            "Date": [
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
            ],
            "Category": ["Electronics", "Clothing", "Electronics", "Food", "Clothing"],
            "Quantity": [10, 25, 15, 30, 20],
        }
    )


@pytest.fixture
def sample_dataframe_with_nulls():
    """Create a sample DataFrame with null values."""
    return pd.DataFrame(
        {
            "Name": ["Alice", "Bob", None, "David", "Eve"],
            "Age": [25, None, 35, 40, None],
            "Score": [85.5, 90.0, 75.5, None, 88.0],
        }
    )


@pytest.fixture
def large_dataframe():
    """Create a larger DataFrame for pagination tests."""
    return pd.DataFrame(
        {
            "ID": range(1, 101),
            "Value": [i * 10 for i in range(1, 101)],
            "Category": [f"Cat_{i % 25}" for i in range(1, 101)],
        }
    )


@pytest.fixture(autouse=True)
def reset_dataframe_state():
    """Reset all session state before each test."""
    from app.agent.session_state import clear_all_sessions

    clear_all_sessions()
    yield
    clear_all_sessions()


@pytest.fixture
def test_session_id():
    """Provide a consistent session ID for tests."""
    return TEST_SESSION_ID


@pytest.fixture
def test_config():
    """Provide a RunnableConfig for tool invocation in tests."""
    return {"configurable": {"thread_id": TEST_SESSION_ID}}


@pytest.fixture
def mock_agent():
    """Create a mock agent for API testing."""
    mock = MagicMock()
    mock.invoke.return_value = {"messages": [MagicMock(content="Here is your chart analysis.")]}
    return mock


@pytest.fixture
def mock_settings():
    """Create mock settings."""
    with patch("app.config.get_settings") as mock:
        mock.return_value = MagicMock(
            gemini_api_key="test-api-key",
            gemini_model="gemini-test",
            charts_dir="tests/static/charts",
        )
        yield mock
