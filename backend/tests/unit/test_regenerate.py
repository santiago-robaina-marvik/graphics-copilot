"""Tests for chart regeneration endpoint."""

from unittest.mock import patch

import pytest

from app.agent.tools.dataframe import set_dataframe
from app.services.sheets import SheetFetchError


@pytest.fixture
def sample_data():
    """Sample data for chart regeneration."""
    return [
        {"category": "A", "value": 10, "sales": 100},
        {"category": "B", "value": 20, "sales": 200},
        {"category": "C", "value": 30, "sales": 300},
    ]


@pytest.fixture
def setup_dataframe(sample_data):
    """Set up dataframe before each test."""
    set_dataframe(sample_data)
    yield
    set_dataframe(None)


class TestRegenerateEndpoint:
    """Tests for POST /api/regenerate endpoint."""

    def test_regenerate_bar_chart(self, client, setup_dataframe, tmp_path):
        """Should regenerate a bar chart with specified parameters."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Regenerated Bar Chart",
                    "theme": "meli_dark",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "chart_url" in data
            assert "chart_metadata" in data
            assert data["chart_metadata"]["chart_type"] == "bar"
            assert data["chart_metadata"]["x_column"] == "category"
            assert data["chart_metadata"]["y_column"] == "value"
            assert data["chart_metadata"]["title"] == "Regenerated Bar Chart"

    def test_regenerate_with_different_columns(self, client, setup_dataframe, tmp_path):
        """Should regenerate chart with different columns (parameter variation)."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            # First chart with category/value
            response1 = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Chart 1",
                },
            )
            assert response1.status_code == 200
            metadata1 = response1.json()["chart_metadata"]

            # Second chart with category/sales (different y_column)
            response2 = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "sales",
                    "title": "Chart 2",
                },
            )
            assert response2.status_code == 200
            metadata2 = response2.json()["chart_metadata"]

            # Verify different columns were used
            assert metadata1["y_column"] == "value"
            assert metadata2["y_column"] == "sales"
            # Verify different chart URLs (different files)
            assert metadata1["chart_url"] != metadata2["chart_url"]

    def test_regenerate_with_different_title(self, client, setup_dataframe, tmp_path):
        """Should regenerate chart with different title."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "title": "Custom Title Here",
                },
            )

            assert response.status_code == 200
            assert response.json()["chart_metadata"]["title"] == "Custom Title Here"

    def test_regenerate_with_different_theme(self, client, setup_dataframe, tmp_path):
        """Should regenerate chart with different theme."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response_dark = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "theme": "meli_dark",
                },
            )

            response_light = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "theme": "meli_light",
                },
            )

            assert response_dark.status_code == 200
            assert response_light.status_code == 200
            assert response_dark.json()["chart_metadata"]["theme"] == "meli_dark"
            assert response_light.json()["chart_metadata"]["theme"] == "meli_light"

    def test_regenerate_line_chart(self, client, setup_dataframe, tmp_path):
        """Should regenerate a line chart."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "line",
                    "x_column": "category",
                    "y_column": "value",
                },
            )

            assert response.status_code == 200
            assert response.json()["chart_metadata"]["chart_type"] == "line"

    def test_regenerate_distribution_chart(self, client, setup_dataframe, tmp_path):
        """Should regenerate a distribution chart with labels/values columns."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "distribution",
                    "labels_column": "category",
                    "values_column": "value",
                },
            )

            assert response.status_code == 200
            metadata = response.json()["chart_metadata"]
            assert metadata["chart_type"] == "distribution"
            assert metadata["labels_column"] == "category"
            assert metadata["values_column"] == "value"

    def test_regenerate_area_chart(self, client, setup_dataframe, tmp_path):
        """Should regenerate an area chart."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "area",
                    "x_column": "category",
                    "y_column": "value",
                },
            )

            assert response.status_code == 200
            assert response.json()["chart_metadata"]["chart_type"] == "area"

    def test_regenerate_unknown_chart_type_returns_400(self, client, setup_dataframe):
        """Should return 400 for unknown chart type."""
        response = client.post(
            "/api/regenerate",
            json={
                "chart_type": "unknown_type",
                "x_column": "category",
                "y_column": "value",
            },
        )

        assert response.status_code == 400
        assert "Unknown chart type" in response.json()["detail"]

    def test_regenerate_invalid_column_returns_400(self, client, setup_dataframe, tmp_path):
        """Should return 400 for non-existent column."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "nonexistent_column",
                    "y_column": "value",
                },
            )

            assert response.status_code == 400
            assert "not found" in response.json()["detail"].lower()

    def test_regenerate_no_data_returns_400(self, client):
        """Should return 400 when no data is loaded."""
        set_dataframe(None)

        response = client.post(
            "/api/regenerate",
            json={
                "chart_type": "bar",
                "x_column": "category",
                "y_column": "value",
            },
        )

        assert response.status_code == 400
        assert "no data" in response.json()["detail"].lower()


class TestRegenerateWithFreshData:
    """Tests for regeneration with fresh Google Sheets data."""

    def test_regenerate_fetches_fresh_data_when_sheet_id_provided(self, client, tmp_path):
        """Should fetch fresh data from Google Sheets when sheet_id is provided."""
        fresh_data = [
            {"category": "X", "value": 100},
            {"category": "Y", "value": 200},
        ]

        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
            patch("app.api.routes.fetch_public_sheet") as mock_fetch,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)
            mock_fetch.return_value = fresh_data

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "sheet_id": "test_sheet_123",
                    "sheet_gid": "0",
                },
            )

            assert response.status_code == 200
            mock_fetch.assert_called_once_with("test_sheet_123", "0")
            # Verify the chart was created with fresh data (2 rows)
            assert response.json()["chart_metadata"]["row_count"] == 2

    def test_regenerate_uses_cached_data_when_no_sheet_id(self, client, setup_dataframe, tmp_path):
        """Should use cached data when no sheet_id is provided."""
        with (
            patch("app.agent.tools.plotting.get_settings") as mock_plotting_settings,
            patch("app.api.routes.get_settings") as mock_routes_settings,
            patch("app.api.routes.fetch_public_sheet") as mock_fetch,
        ):
            mock_plotting_settings.return_value.charts_dir = str(tmp_path)
            mock_routes_settings.return_value.charts_dir = str(tmp_path)

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    # No sheet_id - should use cached data
                },
            )

            assert response.status_code == 200
            mock_fetch.assert_not_called()
            # Uses the 3-row sample_data from setup_dataframe fixture
            assert response.json()["chart_metadata"]["row_count"] == 3

    def test_regenerate_returns_400_on_sheet_fetch_error(self, client):
        """Should return 400 when Google Sheet fetch fails."""
        with patch("app.api.routes.fetch_public_sheet") as mock_fetch:
            mock_fetch.side_effect = SheetFetchError("Sheet not accessible")

            response = client.post(
                "/api/regenerate",
                json={
                    "chart_type": "bar",
                    "x_column": "category",
                    "y_column": "value",
                    "sheet_id": "invalid_sheet",
                },
            )

            assert response.status_code == 400
            assert "Sheet not accessible" in response.json()["detail"]
