"""Tests for the chart trash system."""

import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings
from app.models.schemas import (
    TrashItem,
    TrashListResponse,
    DeleteChartResponse,
    RestoreChartResponse,
)


class TestTrashConfig:
    """Tests for trash configuration properties."""

    def test_trash_dir_property(self):
        """trash_dir should be charts_dir/trash."""
        settings = get_settings()
        assert settings.trash_dir == f"{settings.charts_dir}/trash"

    def test_trash_retention_days(self):
        """trash_retention_days should be 7."""
        settings = get_settings()
        assert settings.trash_retention_days == 7


class TestTrashSchemas:
    """Tests for trash-related Pydantic schemas."""

    def test_trash_item_schema(self):
        """TrashItem should validate correctly."""
        item = TrashItem(
            filename="chart_123.png",
            deleted_at="2026-01-01T12:00:00",
            expires_at="2026-01-08T12:00:00",
            metadata={"title": "Test Chart"},
        )
        assert item.filename == "chart_123.png"
        assert item.deleted_at == "2026-01-01T12:00:00"
        assert item.expires_at == "2026-01-08T12:00:00"
        assert item.metadata == {"title": "Test Chart"}

    def test_trash_item_optional_metadata(self):
        """TrashItem metadata should be optional."""
        item = TrashItem(
            filename="chart_123.png",
            deleted_at="2026-01-01T12:00:00",
            expires_at="2026-01-08T12:00:00",
        )
        assert item.metadata is None

    def test_trash_list_response_schema(self):
        """TrashListResponse should validate correctly."""
        response = TrashListResponse(
            items=[
                TrashItem(
                    filename="chart_1.png",
                    deleted_at="2026-01-01T12:00:00",
                    expires_at="2026-01-08T12:00:00",
                )
            ],
            purged_count=2,
        )
        assert len(response.items) == 1
        assert response.purged_count == 2

    def test_trash_list_response_empty(self):
        """TrashListResponse should work with empty items."""
        response = TrashListResponse(items=[], purged_count=0)
        assert len(response.items) == 0
        assert response.purged_count == 0

    def test_delete_chart_response_schema(self):
        """DeleteChartResponse should validate correctly."""
        response = DeleteChartResponse(
            success=True,
            message="Chart moved to trash",
            filename="chart_123.png",
        )
        assert response.success is True
        assert response.message == "Chart moved to trash"
        assert response.filename == "chart_123.png"

    def test_restore_chart_response_schema(self):
        """RestoreChartResponse should validate correctly."""
        response = RestoreChartResponse(
            success=True,
            message="Chart restored",
            chart_url="/static/charts/chart_123.png",
            chart_metadata={"title": "Test"},
        )
        assert response.success is True
        assert response.chart_url == "/static/charts/chart_123.png"
        assert response.chart_metadata == {"title": "Test"}

    def test_restore_chart_response_optional_metadata(self):
        """RestoreChartResponse metadata should be optional."""
        response = RestoreChartResponse(
            success=True,
            message="Chart restored",
            chart_url="/static/charts/chart_123.png",
        )
        assert response.chart_metadata is None


@pytest.fixture
def temp_charts_dir(tmp_path):
    """Create temporary charts directory for testing."""
    charts_dir = tmp_path / "charts"
    charts_dir.mkdir()
    trash_dir = charts_dir / "trash"
    trash_dir.mkdir()
    return charts_dir


@pytest.fixture
def mock_settings_with_temp_dir(temp_charts_dir):
    """Mock settings to use temp directory."""
    mock_settings = MagicMock()
    mock_settings.charts_dir = str(temp_charts_dir)
    mock_settings.trash_dir = str(temp_charts_dir / "trash")
    mock_settings.trash_retention_days = 7

    with patch("app.api.routes.get_settings", return_value=mock_settings):
        yield mock_settings


@pytest.fixture
def test_chart(temp_charts_dir):
    """Create a test chart file with metadata."""
    chart_filename = "chart_test123"
    png_path = temp_charts_dir / f"{chart_filename}.png"
    json_path = temp_charts_dir / f"{chart_filename}.json"

    # Create dummy PNG
    png_path.write_bytes(b"fake png content")

    # Create metadata
    metadata = {"title": "Test Chart", "chart_type": "bar"}
    json_path.write_text(json.dumps(metadata))

    return chart_filename


class TestTrashRoutes:
    """Tests for trash-related API routes."""

    def test_delete_moves_to_trash(
        self, mock_settings_with_temp_dir, test_chart, temp_charts_dir
    ):
        """DELETE should move chart files to trash directory."""
        client = TestClient(app)

        response = client.delete(f"/api/charts/{test_chart}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Chart moved to trash"
        assert data["filename"] == f"{test_chart}.png"

        # Verify files moved to trash
        trash_png = temp_charts_dir / "trash" / f"{test_chart}.png"
        trash_json = temp_charts_dir / "trash" / f"{test_chart}.json"
        assert trash_png.exists()
        assert trash_json.exists()

        # Verify original files removed
        assert not (temp_charts_dir / f"{test_chart}.png").exists()
        assert not (temp_charts_dir / f"{test_chart}.json").exists()

        # Verify deleted_at was added to metadata
        with open(trash_json) as f:
            metadata = json.load(f)
        assert "deleted_at" in metadata
        assert metadata["title"] == "Test Chart"

    def test_delete_nonexistent_returns_404(self, mock_settings_with_temp_dir):
        """DELETE nonexistent chart should return 404."""
        client = TestClient(app)

        response = client.delete("/api/charts/chart_nonexistent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_delete_validates_filename(self, mock_settings_with_temp_dir):
        """DELETE should reject invalid filenames (must start with chart_)."""
        client = TestClient(app)

        # Test invalid prefix - must start with chart_
        response = client.delete("/api/charts/notachart.png")
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

        # Test empty-like chart name
        response = client.delete("/api/charts/chart_")
        assert response.status_code == 404  # Valid prefix but file doesn't exist

    def test_list_trash_empty(self, mock_settings_with_temp_dir):
        """GET trash should return empty list when trash is empty."""
        client = TestClient(app)

        response = client.get("/api/charts/trash")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["purged_count"] == 0

    def test_list_trash_with_items(
        self, mock_settings_with_temp_dir, test_chart, temp_charts_dir
    ):
        """GET trash should list items in trash."""
        client = TestClient(app)

        # First delete the chart
        client.delete(f"/api/charts/{test_chart}")

        # Now list trash
        response = client.get("/api/charts/trash")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["filename"] == f"{test_chart}.png"
        assert "deleted_at" in data["items"][0]
        assert "expires_at" in data["items"][0]
        # metadata should NOT contain deleted_at (it's a separate field)
        if data["items"][0]["metadata"]:
            assert "deleted_at" not in data["items"][0]["metadata"]

    def test_list_purges_expired(self, mock_settings_with_temp_dir, temp_charts_dir):
        """GET trash should purge items older than retention period."""
        client = TestClient(app)
        trash_dir = temp_charts_dir / "trash"

        # Create an expired item (8 days old)
        old_deleted_at = datetime.now() - timedelta(days=8)
        old_chart = "chart_expired"
        (trash_dir / f"{old_chart}.png").write_bytes(b"old png")
        (trash_dir / f"{old_chart}.json").write_text(
            json.dumps({"deleted_at": old_deleted_at.isoformat(), "title": "Old"})
        )

        # Create a recent item (1 day old)
        recent_deleted_at = datetime.now() - timedelta(days=1)
        recent_chart = "chart_recent"
        (trash_dir / f"{recent_chart}.png").write_bytes(b"recent png")
        (trash_dir / f"{recent_chart}.json").write_text(
            json.dumps({"deleted_at": recent_deleted_at.isoformat(), "title": "Recent"})
        )

        response = client.get("/api/charts/trash")

        assert response.status_code == 200
        data = response.json()
        assert data["purged_count"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["filename"] == f"{recent_chart}.png"

        # Verify old files deleted
        assert not (trash_dir / f"{old_chart}.png").exists()
        assert not (trash_dir / f"{old_chart}.json").exists()

    def test_restore_moves_back(
        self, mock_settings_with_temp_dir, test_chart, temp_charts_dir
    ):
        """POST restore should move chart back to charts directory."""
        client = TestClient(app)

        # First delete the chart
        client.delete(f"/api/charts/{test_chart}")

        # Now restore it
        response = client.post(f"/api/charts/trash/{test_chart}/restore")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Chart restored successfully"
        assert data["chart_url"] == f"/static/charts/{test_chart}.png"

        # Verify files back in charts dir
        assert (temp_charts_dir / f"{test_chart}.png").exists()
        assert (temp_charts_dir / f"{test_chart}.json").exists()

        # Verify files removed from trash
        assert not (temp_charts_dir / "trash" / f"{test_chart}.png").exists()
        assert not (temp_charts_dir / "trash" / f"{test_chart}.json").exists()

    def test_restore_removes_deleted_at(
        self, mock_settings_with_temp_dir, test_chart, temp_charts_dir
    ):
        """POST restore should remove deleted_at from metadata."""
        client = TestClient(app)

        # Delete then restore
        client.delete(f"/api/charts/{test_chart}")
        client.post(f"/api/charts/trash/{test_chart}/restore")

        # Read restored metadata
        json_path = temp_charts_dir / f"{test_chart}.json"
        with open(json_path) as f:
            metadata = json.load(f)

        assert "deleted_at" not in metadata
        assert metadata["title"] == "Test Chart"

    def test_restore_nonexistent_returns_404(self, mock_settings_with_temp_dir):
        """POST restore nonexistent chart should return 404."""
        client = TestClient(app)

        response = client.post("/api/charts/trash/chart_nonexistent/restore")

        assert response.status_code == 404
        assert "not found in trash" in response.json()["detail"].lower()

    def test_restore_validates_filename(self, mock_settings_with_temp_dir):
        """POST restore should reject invalid filenames (must start with chart_)."""
        client = TestClient(app)

        # Test invalid prefix - must start with chart_
        response = client.post("/api/charts/trash/notachart/restore")
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    def test_delete_with_extension(
        self, mock_settings_with_temp_dir, test_chart, temp_charts_dir
    ):
        """DELETE should work with .png extension in filename."""
        client = TestClient(app)

        response = client.delete(f"/api/charts/{test_chart}.png")

        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_restore_with_extension(
        self, mock_settings_with_temp_dir, test_chart, temp_charts_dir
    ):
        """POST restore should work with .png extension in filename."""
        client = TestClient(app)

        client.delete(f"/api/charts/{test_chart}")
        response = client.post(f"/api/charts/trash/{test_chart}.png/restore")

        assert response.status_code == 200
        assert response.json()["success"] is True
