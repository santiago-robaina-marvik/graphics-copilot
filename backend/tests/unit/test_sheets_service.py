"""Tests for Google Sheets fetching service."""

import pytest
from unittest.mock import patch
from io import StringIO

from app.services.sheets import parse_sheet_url, fetch_public_sheet, SheetFetchError


class TestParseSheetUrl:
    """Tests for parse_sheet_url function."""

    def test_parse_basic_url(self):
        """Should extract sheet_id from basic URL."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
        sheet_id, gid = parse_sheet_url(url)
        assert sheet_id == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        assert gid == "0"  # Default

    def test_parse_url_with_gid(self):
        """Should extract gid from URL with tab specified."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456"
        sheet_id, gid = parse_sheet_url(url)
        assert sheet_id == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        assert gid == "123456"

    def test_parse_url_with_gid_in_query(self):
        """Should extract gid from query parameter."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=789"
        sheet_id, gid = parse_sheet_url(url)
        assert gid == "789"

    def test_parse_invalid_url_raises(self):
        """Should raise ValueError for non-Google-Sheets URLs."""
        with pytest.raises(ValueError, match="Invalid Google Sheets URL"):
            parse_sheet_url("https://example.com/not-a-sheet")

    def test_parse_empty_url_raises(self):
        """Should raise ValueError for empty URL."""
        with pytest.raises(ValueError):
            parse_sheet_url("")


class TestFetchPublicSheet:
    """Tests for fetch_public_sheet function."""

    def test_fetch_returns_list_of_dicts(self):
        """Should return data as list of dictionaries."""
        import pandas as pd

        csv_content = "name,value\nAlice,10\nBob,20"
        mock_df = pd.read_csv(StringIO(csv_content))

        with patch("app.services.sheets.pd.read_csv") as mock_read:
            mock_read.return_value = mock_df

            result = fetch_public_sheet("test_sheet_id", "0")

            assert isinstance(result, list)
            assert len(result) == 2
            assert result[0] == {"name": "Alice", "value": 10}
            assert result[1] == {"name": "Bob", "value": 20}

    def test_fetch_constructs_correct_url(self):
        """Should construct correct CSV export URL."""
        with patch("app.services.sheets.pd.read_csv") as mock_read:
            import pandas as pd

            mock_read.return_value = pd.DataFrame({"col": [1]})

            fetch_public_sheet("my_sheet_id", "42")

            expected_url = "https://docs.google.com/spreadsheets/d/my_sheet_id/export?format=csv&gid=42"
            mock_read.assert_called_once_with(expected_url)

    def test_fetch_default_gid_is_zero(self):
        """Should use gid=0 by default."""
        with patch("app.services.sheets.pd.read_csv") as mock_read:
            import pandas as pd

            mock_read.return_value = pd.DataFrame({"col": [1]})

            fetch_public_sheet("my_sheet_id")

            call_url = mock_read.call_args[0][0]
            assert "gid=0" in call_url

    def test_fetch_error_raises_sheet_fetch_error(self):
        """Should wrap pandas errors in SheetFetchError."""
        with patch("app.services.sheets.pd.read_csv") as mock_read:
            mock_read.side_effect = Exception("Network error")

            with pytest.raises(SheetFetchError, match="Failed to fetch"):
                fetch_public_sheet("bad_sheet_id")
