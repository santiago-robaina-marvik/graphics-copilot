"""Tests for the upload chart endpoint."""

import base64
from pathlib import Path


class TestUploadChart:
    """Test the chart upload functionality."""

    def test_upload_chart_success(self, client, tmp_path, monkeypatch):
        """Test successful chart upload."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        # Create a minimal valid PNG (1x1 transparent pixel)
        png_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
            b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        image_data = base64.b64encode(png_data).decode()

        response = client.post(
            "/api/charts/upload",
            json={
                "image_data": image_data,
                "layout_type": "grid",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["chart_url"].startswith("/static/charts/chart_layout_")
        assert data["chart_url"].endswith(".png")
        assert data["chart_metadata"]["chart_type"] == "layout"
        assert data["chart_metadata"]["layout_type"] == "grid"
        assert data["chart_metadata"]["source"] == "template_editor"

        # Verify files were created
        filename = Path(data["chart_url"]).stem
        assert (tmp_path / f"{filename}.png").exists()
        assert (tmp_path / f"{filename}.json").exists()

    def test_upload_chart_with_data_url_prefix(self, client, tmp_path, monkeypatch):
        """Test upload with data URL prefix (as browser generates)."""
        from app.config import get_settings

        settings = get_settings()
        monkeypatch.setattr(settings, "charts_dir", str(tmp_path))

        png_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
            b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        image_data = f"data:image/png;base64,{base64.b64encode(png_data).decode()}"

        response = client.post(
            "/api/charts/upload",
            json={
                "image_data": image_data,
                "layout_type": "half-left",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["chart_metadata"]["layout_type"] == "half-left"

    def test_upload_chart_invalid_base64(self, client):
        """Test upload with invalid base64 data."""
        response = client.post(
            "/api/charts/upload",
            json={
                "image_data": "not-valid-base64!!!",
                "layout_type": "grid",
            },
        )

        assert response.status_code == 400
        assert "Invalid base64" in response.json()["detail"]
