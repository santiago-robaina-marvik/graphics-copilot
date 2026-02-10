"""Pytest configuration and fixtures for backend tests."""

import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create a test client for FastAPI app."""
    return TestClient(app)


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
    """Reset module-level DataFrame state before each test."""
    import app.agent.tools.dataframe as df_module

    df_module._current_df = None
    df_module._original_df = None
    yield
    df_module._current_df = None
    df_module._original_df = None


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
