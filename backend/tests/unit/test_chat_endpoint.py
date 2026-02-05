"""Tests for /api/chat endpoint with fresh data fetching."""

from unittest.mock import patch, MagicMock

from app.services.sheets import SheetFetchError


class TestChatWithFreshData:
    """Tests for chat endpoint with Google Sheets data fetching."""

    def test_chat_fetches_fresh_data_when_sheet_id_provided(self, client):
        """Should fetch fresh data from Google Sheets when sheet_id is provided."""
        fresh_data = [
            {"category": "X", "value": 100},
            {"category": "Y", "value": 200},
        ]

        with (
            patch("app.api.routes.fetch_public_sheet") as mock_fetch,
            patch("app.api.routes.get_agent") as mock_agent,
        ):
            mock_fetch.return_value = fresh_data

            # Mock the agent to return a simple response
            mock_result = MagicMock()
            mock_result.__getitem__ = lambda self, key: {
                "messages": [MagicMock(content="Data loaded successfully")]
            }[key]
            mock_agent.return_value.invoke.return_value = mock_result

            response = client.post(
                "/api/chat",
                json={
                    "message": "show me the data",
                    "session_id": "test-session",
                    "sheet_id": "test_sheet_123",
                    "sheet_gid": "0",
                },
            )

            assert response.status_code == 200
            mock_fetch.assert_called_once_with("test_sheet_123", "0")

    def test_chat_falls_back_to_provided_data_on_fetch_error(self, client):
        """Should fall back to provided data when sheet fetch fails."""
        fallback_data = [{"a": 1, "b": 2}]

        with (
            patch("app.api.routes.fetch_public_sheet") as mock_fetch,
            patch("app.api.routes.get_agent") as mock_agent,
            patch("app.api.routes.set_dataframe") as mock_set_df,
        ):
            mock_fetch.side_effect = SheetFetchError("Network error")

            mock_result = MagicMock()
            mock_result.__getitem__ = lambda self, key: {
                "messages": [MagicMock(content="Using fallback data")]
            }[key]
            mock_agent.return_value.invoke.return_value = mock_result

            response = client.post(
                "/api/chat",
                json={
                    "message": "show data",
                    "session_id": "test-session",
                    "data": fallback_data,
                    "sheet_id": "bad_sheet",
                },
            )

            assert response.status_code == 200
            # Should have called set_dataframe with fallback data
            mock_set_df.assert_called_with(fallback_data)

    def test_chat_uses_provided_data_when_no_sheet_id(self, client):
        """Should use provided data when no sheet_id is given."""
        provided_data = [{"x": 1}, {"x": 2}]

        with (
            patch("app.api.routes.fetch_public_sheet") as mock_fetch,
            patch("app.api.routes.get_agent") as mock_agent,
            patch("app.api.routes.set_dataframe") as mock_set_df,
        ):
            mock_result = MagicMock()
            mock_result.__getitem__ = lambda self, key: {
                "messages": [MagicMock(content="OK")]
            }[key]
            mock_agent.return_value.invoke.return_value = mock_result

            response = client.post(
                "/api/chat",
                json={
                    "message": "hello",
                    "session_id": "test-session",
                    "data": provided_data,
                    # No sheet_id
                },
            )

            assert response.status_code == 200
            mock_fetch.assert_not_called()
            mock_set_df.assert_called_with(provided_data)
