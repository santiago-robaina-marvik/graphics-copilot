"""Tests for app/agent/tools/themes.py"""

import pytest

from app.agent.tools.themes import (
    THEMES,
    ChartTheme,
    set_theme,
    get_theme,
    get_available_themes,
)


class TestChartTheme:
    """Tests for ChartTheme dataclass."""

    def test_theme_has_required_fields(self):
        """ChartTheme should have all required fields."""
        theme = THEMES["meli_dark"]
        assert isinstance(theme, ChartTheme)
        assert theme.name == "meli_dark"
        assert theme.display_name == "Meli Dark"
        assert theme.figure_facecolor == "#0B0C20"
        assert theme.text_color == "#A5A8AD"
        assert len(theme.palette) == 6


class TestThemes:
    """Tests for theme constants."""

    def test_all_themes_defined(self):
        """THEMES should contain all expected themes."""
        assert "meli_dark" in THEMES
        assert "meli_light" in THEMES
        assert "meli_yellow" in THEMES

    def test_meli_dark_theme(self):
        """Meli Dark theme should have correct colors."""
        theme = THEMES["meli_dark"]
        assert theme.figure_facecolor == "#0B0C20"
        assert theme.text_color == "#A5A8AD"
        assert "#3483FA" in theme.palette

    def test_meli_light_theme(self):
        """Meli Light theme should have correct colors."""
        theme = THEMES["meli_light"]
        assert theme.figure_facecolor == "#FFFFFF"
        assert theme.text_color == "#333333"
        assert "#3483FA" in theme.palette

    def test_meli_yellow_theme(self):
        """Meli Yellow theme should have correct colors."""
        theme = THEMES["meli_yellow"]
        assert theme.figure_facecolor == "#FFFFFF"
        assert theme.text_color == "#2D3277"
        assert "#2D3277" in theme.palette


class TestSetTheme:
    """Tests for set_theme function."""

    def test_set_theme_valid(self):
        """set_theme should set valid theme."""
        set_theme("meli_light")
        assert get_theme().name == "meli_light"

        set_theme("meli_dark")
        assert get_theme().name == "meli_dark"

    def test_set_theme_invalid(self):
        """set_theme should raise for invalid theme."""
        with pytest.raises(ValueError, match="Unknown theme"):
            set_theme("invalid_theme")


class TestGetTheme:
    """Tests for get_theme function."""

    def test_get_theme_returns_current(self):
        """get_theme should return current theme."""
        set_theme("meli_yellow")
        theme = get_theme()
        assert theme.name == "meli_yellow"
        assert isinstance(theme, ChartTheme)


class TestGetAvailableThemes:
    """Tests for get_available_themes function."""

    def test_returns_all_themes(self):
        """get_available_themes should return all themes."""
        themes = get_available_themes()
        assert len(themes) == 3

    def test_theme_format(self):
        """get_available_themes should return correct format."""
        themes = get_available_themes()

        for theme in themes:
            assert "name" in theme
            assert "display_name" in theme
            assert "background" in theme
            assert "text_color" in theme
            assert "palette" in theme
            assert isinstance(theme["palette"], list)

    def test_contains_meli_dark(self):
        """get_available_themes should include meli_dark."""
        themes = get_available_themes()
        dark_theme = next((t for t in themes if t["name"] == "meli_dark"), None)

        assert dark_theme is not None
        assert dark_theme["display_name"] == "Meli Dark"
        assert dark_theme["background"] == "#0B0C20"
