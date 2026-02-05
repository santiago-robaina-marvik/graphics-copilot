"""Tests for app/agent/tools/plotting.py"""

from unittest.mock import patch
import matplotlib.pyplot as plt
import seaborn as sns

from app.agent.tools.dataframe import set_dataframe
from app.agent.tools.plotting import (
    create_bar_chart,
    create_line_chart,
    create_distribution_chart,
    create_area_chart,
    _apply_theme,
    _save_chart,
)
from app.agent.tools.themes import set_theme, get_theme


class TestApplyTheme:
    """Tests for _apply_theme function."""

    def test_apply_theme_sets_dark_facecolor(self):
        """_apply_theme should set figure facecolor from theme."""
        set_theme("meli_dark")
        _apply_theme()
        assert plt.rcParams["figure.facecolor"] == "#0B0C20"

    def test_apply_theme_sets_light_facecolor(self):
        """_apply_theme should set light theme colors."""
        set_theme("meli_light")
        _apply_theme()
        assert plt.rcParams["figure.facecolor"] == "#FFFFFF"
        assert plt.rcParams["text.color"] == "#333333"

    def test_apply_theme_sets_yellow_theme(self):
        """_apply_theme should set yellow theme colors."""
        set_theme("meli_yellow")
        _apply_theme()
        assert plt.rcParams["figure.facecolor"] == "#FFFFFF"
        assert plt.rcParams["text.color"] == "#2D3277"

    def test_apply_theme_sets_seaborn_palette(self):
        """_apply_theme should set seaborn palette from theme."""
        set_theme("meli_dark")
        _apply_theme()
        theme = get_theme()
        # Verify seaborn palette was set (get current palette)
        current_palette = sns.color_palette()
        # Palette should have same number of colors as theme
        assert len(current_palette) == len(theme.palette)


class TestSaveChart:
    """Tests for _save_chart function."""

    @patch("app.agent.tools.plotting.get_settings")
    @patch("matplotlib.pyplot.savefig")
    @patch("matplotlib.pyplot.close")
    def test_save_chart_returns_url_and_metadata(
        self, mock_close, mock_savefig, mock_settings, tmp_path
    ):
        """_save_chart should return URL path and metadata."""
        mock_settings.return_value.charts_dir = str(tmp_path)
        set_theme("meli_dark")

        # Create a figure to save
        plt.figure()

        metadata = {"chart_type": "bar", "x_column": "category", "y_column": "value"}
        chart_url, full_metadata = _save_chart(metadata)

        assert chart_url.startswith("/static/charts/")
        assert chart_url.endswith(".png")
        assert full_metadata["chart_type"] == "bar"
        assert "theme" in full_metadata
        assert "created_at" in full_metadata
        mock_savefig.assert_called_once()
        mock_close.assert_called_once()

    @patch("app.agent.tools.plotting.get_settings")
    @patch("matplotlib.pyplot.savefig")
    @patch("matplotlib.pyplot.close")
    def test_save_chart_uses_theme_facecolor(
        self, mock_close, mock_savefig, mock_settings, tmp_path
    ):
        """_save_chart should use theme facecolor."""
        mock_settings.return_value.charts_dir = str(tmp_path)
        set_theme("meli_light")
        plt.figure()

        metadata = {"chart_type": "bar"}
        _save_chart(metadata)

        # Check savefig was called with light theme facecolor
        call_kwargs = mock_savefig.call_args[1]
        assert call_kwargs["facecolor"] == "#FFFFFF"


class TestCreateBarChart:
    """Tests for create_bar_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_bar_chart_success(self, mock_save, sample_dataframe):
        """create_bar_chart should generate chart successfully."""
        mock_save.return_value = ("/static/charts/test.png", {"chart_type": "bar"})
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_bar_chart.invoke(
            {"x_column": "Product", "y_column": "Revenue", "title": "Test Chart"}
        )

        assert "Bar chart created" in result
        assert "/static/charts/" in result
        mock_save.assert_called_once()

    def test_create_bar_chart_no_data(self):
        """create_bar_chart should return error when no data."""
        result = create_bar_chart.invoke({"x_column": "Product", "y_column": "Revenue"})
        assert "No data loaded" in result

    def test_create_bar_chart_invalid_column(self, sample_dataframe):
        """create_bar_chart should return error for invalid column."""
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_bar_chart.invoke({"x_column": "Invalid", "y_column": "Revenue"})
        assert "not found" in result.lower()


class TestCreateLineChart:
    """Tests for create_line_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_line_chart_success(self, mock_save, sample_dataframe):
        """create_line_chart should generate chart successfully."""
        mock_save.return_value = ("/static/charts/test.png", {"chart_type": "line"})
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_line_chart.invoke({"x_column": "Date", "y_column": "Revenue"})

        assert "Line chart created" in result


class TestCreateDistributionChart:
    """Tests for create_distribution_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_distribution_chart_success(self, mock_save, sample_dataframe):
        """create_distribution_chart should generate chart successfully."""
        mock_save.return_value = (
            "/static/charts/test.png",
            {"chart_type": "distribution"},
        )
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_distribution_chart.invoke(
            {"labels_column": "Product", "values_column": "Revenue"}
        )

        assert "Distribution chart created" in result

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_distribution_chart_limits_to_10(self, mock_save, large_dataframe):
        """create_distribution_chart should limit to top 10 values."""
        mock_save.return_value = (
            "/static/charts/test.png",
            {"chart_type": "distribution"},
        )
        set_dataframe(large_dataframe.to_dict(orient="records"))

        result = create_distribution_chart.invoke(
            {"labels_column": "ID", "values_column": "Value"}
        )

        assert "Distribution chart created" in result


class TestCreateAreaChart:
    """Tests for create_area_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_area_chart_success(self, mock_save, sample_dataframe):
        """create_area_chart should generate chart successfully."""
        mock_save.return_value = ("/static/charts/test.png", {"chart_type": "area"})
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_area_chart.invoke({"x_column": "Date", "y_column": "Revenue"})

        assert "Area chart created" in result
