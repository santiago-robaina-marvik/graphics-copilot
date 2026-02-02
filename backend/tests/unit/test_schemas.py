"""Tests for app/models/schemas.py"""

import pytest
from pydantic import ValidationError

from app.models.schemas import ChatRequest, ChatResponse


class TestChatRequest:
    """Tests for ChatRequest schema."""

    def test_valid_request_minimal(self):
        """ChatRequest with only required fields should be valid."""
        request = ChatRequest(message="Hello", session_id="test-123")
        assert request.message == "Hello"
        assert request.session_id == "test-123"
        assert request.data is None

    def test_valid_request_with_data(self):
        """ChatRequest with data should be valid."""
        data = [{"col1": "a", "col2": 1}, {"col1": "b", "col2": 2}]
        request = ChatRequest(message="Hello", session_id="test-123", data=data)
        assert request.data == data
        assert len(request.data) == 2

    def test_missing_message_raises(self):
        """ChatRequest without message should raise ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(session_id="test-123")

    def test_missing_session_id_raises(self):
        """ChatRequest without session_id should raise ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(message="Hello")

    def test_empty_message_allowed(self):
        """ChatRequest allows empty string message (validation at app level)."""
        request = ChatRequest(message="", session_id="test-123")
        assert request.message == ""


class TestChatResponse:
    """Tests for ChatResponse schema."""

    def test_valid_response_minimal(self):
        """ChatResponse with required fields should be valid."""
        response = ChatResponse(response="Hello", session_id="test-123")
        assert response.response == "Hello"
        assert response.chart_url is None

    def test_valid_response_with_chart(self):
        """ChatResponse with chart_url should be valid."""
        response = ChatResponse(
            response="Here's your chart",
            chart_url="/static/charts/chart_123.png",
            session_id="test-123",
        )
        assert response.chart_url == "/static/charts/chart_123.png"
