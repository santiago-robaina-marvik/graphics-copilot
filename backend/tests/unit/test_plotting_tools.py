"""Tests for app/agent/tools/plotting.py"""

from unittest.mock import patch
import matplotlib.pyplot as plt

from app.agent.tools.dataframe import set_dataframe
from app.agent.tools.plotting import (
    create_bar_chart,
    create_line_chart,
    create_pie_chart,
    create_area_chart,
    _setup_dark_style,
    _save_chart,
)


class TestSetupDarkStyle:
    """Tests for _setup_dark_style function."""

    def test_dark_style_sets_facecolor(self):
        """_setup_dark_style should set dark figure facecolor."""
        _setup_dark_style()
        assert plt.rcParams["figure.facecolor"] == "#1a1a24"

    def test_dark_style_sets_axes_color(self):
        """_setup_dark_style should set dark axes facecolor."""
        _setup_dark_style()
        assert plt.rcParams["axes.facecolor"] == "#1a1a24"


class TestSaveChart:
    """Tests for _save_chart function."""

    @patch("app.agent.tools.plotting.get_settings")
    @patch("matplotlib.pyplot.savefig")
    @patch("matplotlib.pyplot.close")
    def test_save_chart_returns_url(self, mock_close, mock_savefig, mock_settings):
        """_save_chart should return URL path."""
        mock_settings.return_value.charts_dir = "/tmp/charts"

        # Create a figure to save
        plt.figure()

        result = _save_chart()

        assert result.startswith("/static/charts/")
        assert result.endswith(".png")
        mock_savefig.assert_called_once()
        mock_close.assert_called_once()


class TestCreateBarChart:
    """Tests for create_bar_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_bar_chart_success(self, mock_save, sample_dataframe):
        """create_bar_chart should generate chart successfully."""
        mock_save.return_value = "/static/charts/test.png"
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
        mock_save.return_value = "/static/charts/test.png"
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_line_chart.invoke({"x_column": "Date", "y_column": "Revenue"})

        assert "Line chart created" in result


class TestCreatePieChart:
    """Tests for create_pie_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_pie_chart_success(self, mock_save, sample_dataframe):
        """create_pie_chart should generate chart successfully."""
        mock_save.return_value = "/static/charts/test.png"
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_pie_chart.invoke(
            {"labels_column": "Product", "values_column": "Revenue"}
        )

        assert "Pie chart created" in result

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_pie_chart_limits_to_10(self, mock_save, large_dataframe):
        """create_pie_chart should limit to top 10 values."""
        mock_save.return_value = "/static/charts/test.png"
        set_dataframe(large_dataframe.to_dict(orient="records"))

        result = create_pie_chart.invoke(
            {"labels_column": "ID", "values_column": "Value"}
        )

        assert "Pie chart created" in result


class TestCreateAreaChart:
    """Tests for create_area_chart tool."""

    @patch("app.agent.tools.plotting._save_chart")
    def test_create_area_chart_success(self, mock_save, sample_dataframe):
        """create_area_chart should generate chart successfully."""
        mock_save.return_value = "/static/charts/test.png"
        set_dataframe(sample_dataframe.to_dict(orient="records"))

        result = create_area_chart.invoke({"x_column": "Date", "y_column": "Revenue"})

        assert "Area chart created" in result
