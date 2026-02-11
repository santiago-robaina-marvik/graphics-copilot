"""Tests for app/models/schemas.py"""

import pytest
from pydantic import ValidationError

from app.models.schemas import ChatRequest, ChatResponse, RegenerateRequest


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

    def test_with_sheet_source(self):
        """Should accept sheet_id and sheet_gid."""
        req = ChatRequest(
            message="create chart",
            session_id="sess1",
            sheet_id="abc123",
            sheet_gid="42",
        )
        assert req.sheet_id == "abc123"
        assert req.sheet_gid == "42"

    def test_sheet_gid_defaults_to_zero(self):
        """Should default sheet_gid to '0'."""
        req = ChatRequest(message="hello", session_id="sess1")
        assert req.sheet_id is None
        assert req.sheet_gid == "0"

    def test_with_data_and_sheet(self):
        """Should accept both data and sheet source."""
        req = ChatRequest(
            message="create chart",
            session_id="sess1",
            data=[{"a": 1}],
            sheet_id="abc123",
        )
        assert req.data == [{"a": 1}]
        assert req.sheet_id == "abc123"


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


class TestRegenerateRequest:
    """Tests for RegenerateRequest schema."""

    def test_minimal_request(self):
        """Should accept minimal valid request."""
        req = RegenerateRequest(chart_type="bar", session_id="sess1")
        assert req.chart_type == "bar"
        assert req.session_id == "sess1"
        assert req.sheet_id is None
        assert req.sheet_gid == "0"

    def test_with_sheet_source(self):
        """Should accept sheet_id and sheet_gid."""
        req = RegenerateRequest(
            chart_type="bar",
            session_id="sess1",
            x_column="category",
            y_column="value",
            sheet_id="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
            sheet_gid="123",
        )
        assert req.sheet_id == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        assert req.sheet_gid == "123"

    def test_sheet_gid_defaults_to_zero(self):
        """Should default sheet_gid to '0' when only sheet_id provided."""
        req = RegenerateRequest(
            chart_type="bar",
            session_id="sess1",
            sheet_id="some_sheet_id",
        )
        assert req.sheet_gid == "0"

    def test_invalid_theme_raises(self):
        """Should reject invalid theme values."""
        with pytest.raises(ValidationError):
            RegenerateRequest(chart_type="bar", session_id="sess1", theme="invalid_theme")

    def test_missing_session_id_raises(self):
        """Should reject request without session_id."""
        with pytest.raises(ValidationError):
            RegenerateRequest(chart_type="bar")
