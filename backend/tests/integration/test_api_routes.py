"""Integration tests for app/api/routes.py"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_returns_ok(self, client):
        """Health endpoint should return status ok."""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestChatEndpoint:
    """Tests for POST /api/chat endpoint."""

    @patch("app.api.routes.get_agent")
    def test_chat_minimal_request(self, mock_get_agent, client):
        """Chat should handle minimal request."""
        mock_agent = MagicMock()
        mock_agent.invoke.return_value = {"messages": [MagicMock(content="Hello! How can I help?")]}
        mock_get_agent.return_value = mock_agent

        response = client.post("/api/chat", json={"message": "Hello", "session_id": "test-session-123"})

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["session_id"] == "test-session-123"

    @patch("app.api.routes.get_agent")
    @patch("app.api.routes.set_dataframe")
    def test_chat_with_data(self, mock_set_df, mock_get_agent, client):
        """Chat should inject data when provided."""
        mock_agent = MagicMock()
        mock_agent.invoke.return_value = {"messages": [MagicMock(content="I see your data.")]}
        mock_get_agent.return_value = mock_agent

        response = client.post(
            "/api/chat",
            json={
                "message": "Analyze my data",
                "session_id": "test-123",
                "data": [{"col1": "a", "col2": 1}],
            },
        )

        assert response.status_code == 200
        mock_set_df.assert_called_once_with([{"col1": "a", "col2": 1}])

    @patch("app.api.routes.get_agent")
    def test_chat_extracts_chart_url(self, mock_get_agent, client):
        """Chat should extract chart URL from messages."""
        mock_agent = MagicMock()
        mock_message = MagicMock()
        mock_message.content = "Chart created: /static/charts/chart_123.png"
        mock_agent.invoke.return_value = {"messages": [mock_message]}
        mock_get_agent.return_value = mock_agent

        response = client.post(
            "/api/chat",
            json={"message": "Create a bar chart", "session_id": "test-123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["chart_url"] == "/static/charts/chart_123.png"

    @patch("app.api.routes.get_agent")
    def test_chat_handles_list_content(self, mock_get_agent, client):
        """Chat should handle list-formatted content blocks."""
        mock_agent = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [
            {"type": "text", "text": "Part 1. "},
            {"type": "text", "text": "Part 2."},
        ]
        mock_agent.invoke.return_value = {"messages": [mock_message]}
        mock_get_agent.return_value = mock_agent

        response = client.post("/api/chat", json={"message": "Hello", "session_id": "test-123"})

        assert response.status_code == 200
        data = response.json()
        assert "Part 1" in data["response"]
        assert "Part 2" in data["response"]

    @patch("app.api.routes.get_agent")
    def test_chat_handles_agent_error(self, mock_get_agent, client):
        """Chat should return 500 on agent error."""
        mock_agent = MagicMock()
        mock_agent.invoke.side_effect = Exception("LLM API error")
        mock_get_agent.return_value = mock_agent

        response = client.post("/api/chat", json={"message": "Hello", "session_id": "test-123"})

        assert response.status_code == 500
        assert "LLM API error" in response.json()["detail"]

    def test_chat_validates_request(self, client):
        """Chat should validate required fields."""
        response = client.post(
            "/api/chat",
            json={
                "message": "Hello"
                # Missing session_id
            },
        )

        assert response.status_code == 422  # Validation error


class TestResetSessionEndpoint:
    """Tests for POST /api/reset/{session_id} endpoint."""

    def test_reset_session_returns_ok(self, client):
        """Reset should return acknowledgment."""
        response = client.post("/api/reset/test-session-123")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "test-session-123" in data["message"]


class TestHistoryEndpoint:
    """Tests for GET /api/sessions/{session_id}/history endpoint."""

    @patch("app.api.routes.get_agent")
    def test_history_returns_messages(self, mock_get_agent, client):
        """History should return message list."""
        mock_agent = MagicMock()
        mock_state = MagicMock()
        mock_state.values = {
            "messages": [
                MagicMock(__class__=type("HumanMessage", (), {}), content="Hello"),
                MagicMock(__class__=type("AIMessage", (), {}), content="Hi there"),
            ]
        }
        mock_agent.get_state.return_value = mock_state
        mock_get_agent.return_value = mock_agent

        response = client.get("/api/sessions/test-123/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @patch("app.api.routes.get_agent")
    def test_history_empty_session(self, mock_get_agent, client):
        """History should handle empty session."""
        mock_agent = MagicMock()
        mock_state = MagicMock()
        mock_state.values = {"messages": []}
        mock_agent.get_state.return_value = mock_state
        mock_get_agent.return_value = mock_agent

        response = client.get("/api/sessions/new-session/history")

        assert response.status_code == 200
        data = response.json()
        assert data["history"] == []
        assert data["session_id"] == "new-session"
