"""Tests for chart metadata sidecar functionality."""

import json
from unittest.mock import patch

import pytest

from app.agent.tools.dataframe import set_dataframe, set_data_source
from app.agent.tools.plotting import (
    create_bar_chart,
    create_line_chart,
    create_distribution_chart,
    create_area_chart,
)

SID = "test-session"
CFG = {"configurable": {"thread_id": SID}}


@pytest.fixture
def sample_data():
    """Sample data for chart generation."""
    return [
        {"category": "A", "value": 10, "count": 100},
        {"category": "B", "value": 20, "count": 200},
        {"category": "C", "value": 30, "count": 300},
    ]


@pytest.fixture
def setup_dataframe(sample_data):
    """Set up dataframe before each test."""
    set_dataframe(SID, sample_data)
    yield
    set_dataframe(SID, None)


class TestChartMetadataSidecar:
    """Test that chart generation creates JSON sidecar files."""

    def test_bar_chart_creates_metadata_file(self, setup_dataframe, tmp_path):
        """Bar chart should create both PNG and JSON files."""
        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_bar_chart.invoke(
                {
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Test Bar Chart",
                },
                CFG,
            )

            # Find created files
            png_files = list(tmp_path.glob("chart_*.png"))
            json_files = list(tmp_path.glob("chart_*.json"))

            assert len(png_files) == 1, "Should create one PNG file"
            assert len(json_files) == 1, "Should create one JSON file"

            # Verify JSON content
            with open(json_files[0]) as f:
                metadata = json.load(f)

            assert metadata["chart_type"] == "bar"
            assert metadata["x_column"] == "category"
            assert metadata["y_column"] == "value"
            assert metadata["title"] == "Test Bar Chart"
            assert "theme" in metadata
            assert "created_at" in metadata
            assert "chart_url" in metadata
            assert metadata["row_count"] == 3

    def test_line_chart_creates_metadata_file(self, setup_dataframe, tmp_path):
        """Line chart should create both PNG and JSON files."""
        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_line_chart.invoke(
                {
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Test Line Chart",
                },
                CFG,
            )

            json_files = list(tmp_path.glob("chart_*.json"))
            assert len(json_files) == 1

            with open(json_files[0]) as f:
                metadata = json.load(f)

            assert metadata["chart_type"] == "line"
            assert metadata["x_column"] == "category"
            assert metadata["y_column"] == "value"

    def test_distribution_chart_creates_metadata_file(self, setup_dataframe, tmp_path):
        """Distribution chart should create metadata with labels/values columns."""
        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_distribution_chart.invoke(
                {
                    "labels_column": "category",
                    "values_column": "value",
                    "title": "Test Distribution",
                },
                CFG,
            )

            json_files = list(tmp_path.glob("chart_*.json"))
            assert len(json_files) == 1

            with open(json_files[0]) as f:
                metadata = json.load(f)

            assert metadata["chart_type"] == "distribution"
            assert metadata["labels_column"] == "category"
            assert metadata["values_column"] == "value"

    def test_area_chart_creates_metadata_file(self, setup_dataframe, tmp_path):
        """Area chart should create both PNG and JSON files."""
        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_area_chart.invoke(
                {
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Test Area Chart",
                },
                CFG,
            )

            json_files = list(tmp_path.glob("chart_*.json"))
            assert len(json_files) == 1

            with open(json_files[0]) as f:
                metadata = json.load(f)

            assert metadata["chart_type"] == "area"

    def test_metadata_filename_matches_png(self, setup_dataframe, tmp_path):
        """JSON filename should match PNG filename (different extension only)."""
        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_bar_chart.invoke(
                {
                    "x_column": "category",
                    "y_column": "value",
                },
                CFG,
            )

            png_file = list(tmp_path.glob("chart_*.png"))[0]
            json_file = list(tmp_path.glob("chart_*.json"))[0]

            assert png_file.stem == json_file.stem


class TestReadChartMetadata:
    """Test reading metadata from JSON sidecar files."""

    def test_read_metadata_returns_none_for_nonexistent_file(self, tmp_path):
        """Should return None when JSON file doesn't exist."""
        from app.api.routes import _read_chart_metadata

        with patch("app.api.routes.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            result = _read_chart_metadata("/static/charts/nonexistent.png")
            assert result is None

    def test_read_metadata_returns_data_from_json(self, tmp_path):
        """Should read and return metadata from JSON sidecar file."""
        from app.api.routes import _read_chart_metadata

        # Create a test JSON file
        metadata = {"chart_type": "bar", "x_column": "category"}
        json_path = tmp_path / "chart_test.json"
        with open(json_path, "w") as f:
            json.dump(metadata, f)

        with patch("app.api.routes.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            result = _read_chart_metadata("/static/charts/chart_test.png")
            assert result is not None
            assert result["chart_type"] == "bar"
            assert result["x_column"] == "category"

    def test_read_metadata_returns_none_for_invalid_json(self, tmp_path):
        """Should return None gracefully for invalid JSON."""
        from app.api.routes import _read_chart_metadata

        # Create an invalid JSON file
        json_path = tmp_path / "chart_invalid.json"
        with open(json_path, "w") as f:
            f.write("not valid json {{{")

        with patch("app.api.routes.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            result = _read_chart_metadata("/static/charts/chart_invalid.png")
            assert result is None

    def test_read_metadata_logs_warning_on_error(self, tmp_path):
        """Should log a warning when metadata read fails."""
        from app.api.routes import _read_chart_metadata

        # Create an invalid JSON file to trigger exception
        json_path = tmp_path / "chart_broken.json"
        with open(json_path, "w") as f:
            f.write("not valid json")

        with (
            patch("app.api.routes.get_settings") as mock_settings,
            patch("app.api.routes.logger") as mock_logger,
        ):
            mock_settings.return_value.charts_dir = str(tmp_path)

            result = _read_chart_metadata("/static/charts/chart_broken.png")

            assert result is None
            mock_logger.warning.assert_called_once()
            assert "chart_broken.png" in mock_logger.warning.call_args[0][0]

    def test_read_metadata_returns_none_for_none_url(self):
        """Should return None when chart_url is None."""
        from app.api.routes import _read_chart_metadata

        result = _read_chart_metadata(None)
        assert result is None


class TestChartMetadataWithDataSource:
    """Test that chart metadata includes data source when available."""

    def test_bar_chart_includes_data_source_in_metadata(self, setup_dataframe, tmp_path):
        """Bar chart metadata should include data_source when set."""
        set_data_source(
            SID,
            {
                "type": "google_sheets",
                "sheet_id": "test_sheet_123",
                "sheet_gid": "42",
            },
        )

        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_bar_chart.invoke(
                {
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Test Chart",
                },
                CFG,
            )

            json_files = list(tmp_path.glob("chart_*.json"))
            assert len(json_files) == 1

            with open(json_files[0]) as f:
                metadata = json.load(f)

            assert "data_source" in metadata
            assert metadata["data_source"]["type"] == "google_sheets"
            assert metadata["data_source"]["sheet_id"] == "test_sheet_123"
            assert metadata["data_source"]["sheet_gid"] == "42"

    def test_bar_chart_no_data_source_when_not_set(self, setup_dataframe, tmp_path):
        """Bar chart metadata should not include data_source when not set."""
        set_data_source(SID, None)

        with patch("app.agent.tools.plotting.get_settings") as mock_settings:
            mock_settings.return_value.charts_dir = str(tmp_path)

            create_bar_chart.invoke(
                {
                    "x_column": "category",
                    "y_column": "value",
                },
                CFG,
            )

            json_files = list(tmp_path.glob("chart_*.json"))
            with open(json_files[0]) as f:
                metadata = json.load(f)

            assert "data_source" not in metadata
