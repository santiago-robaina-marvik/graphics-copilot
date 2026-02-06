"""Tests for the compose layout endpoint."""

from pathlib import Path

from PIL import Image


def _create_test_chart(charts_dir: Path, name: str = "chart_test_001") -> str:
    """Create a test chart image and return the filename."""
    img = Image.new("RGBA", (1181, 650), (100, 150, 200, 255))
    png_path = charts_dir / f"{name}.png"
    img.save(png_path, "PNG")
    return name


class TestComposeLayout:
    """Test the compose layout endpoint."""

    def test_compose_layout_success(self, client, tmp_path, monkeypatch):
        """Test successful layout composition."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        chart1 = _create_test_chart(tmp_path, "chart_test_001")
        chart2 = _create_test_chart(tmp_path, "chart_test_002")

        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "split-horizontal",
                "chart_filenames": [chart1, chart2],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["chart_url"].startswith("/static/charts/chart_layout_")
        assert data["chart_url"].endswith(".png")
        assert data["chart_metadata"]["chart_type"] == "layout"
        assert data["chart_metadata"]["layout_type"] == "split-horizontal"
        assert data["chart_metadata"]["composed_from"] == [chart1, chart2]

        # Verify files were created
        filename = Path(data["chart_url"]).stem
        assert (tmp_path / f"{filename}.png").exists()
        assert (tmp_path / f"{filename}.json").exists()

    def test_compose_full_layout(self, client, tmp_path, monkeypatch):
        """Test full layout with single chart."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        chart = _create_test_chart(tmp_path)

        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "full",
                "chart_filenames": [chart],
            },
        )

        assert response.status_code == 200
        assert response.json()["chart_metadata"]["layout_type"] == "full"

    def test_compose_grid_layout(self, client, tmp_path, monkeypatch):
        """Test 2x2 grid layout."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        charts = [_create_test_chart(tmp_path, f"chart_test_{i:03d}") for i in range(4)]

        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "grid",
                "chart_filenames": charts,
            },
        )

        assert response.status_code == 200
        assert response.json()["chart_metadata"]["layout_type"] == "grid"

    def test_invalid_layout_type(self, client):
        """Test with invalid layout type."""
        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "invalid",
                "chart_filenames": ["chart_test"],
            },
        )

        assert response.status_code == 400
        assert "Invalid layout type" in response.json()["detail"]

    def test_wrong_chart_count(self, client, tmp_path, monkeypatch):
        """Test with wrong number of charts for layout."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        chart = _create_test_chart(tmp_path)

        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "grid",
                "chart_filenames": [chart],
            },
        )

        assert response.status_code == 400
        assert "requires 4 charts" in response.json()["detail"]

    def test_missing_chart_file(self, client, tmp_path, monkeypatch):
        """Test with chart file that doesn't exist."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "full",
                "chart_filenames": ["chart_nonexistent"],
            },
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_invalid_filename_format(self, client):
        """Test with filename that doesn't start with chart_."""
        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "full",
                "chart_filenames": ["malicious_file"],
            },
        )

        assert response.status_code == 400
        assert "Invalid chart filename" in response.json()["detail"]

    def test_path_traversal_blocked(self, client):
        """Test that path traversal is blocked."""
        response = client.post(
            "/api/charts/compose-layout",
            json={
                "layout_type": "full",
                "chart_filenames": ["chart_../../etc/passwd"],
            },
        )

        assert response.status_code == 400
        assert "Invalid chart filename" in response.json()["detail"]
