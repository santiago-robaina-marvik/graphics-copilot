"""Tests for app/agent/tools/themes.py"""

import pytest

from app.agent.tools.themes import (
    THEMES,
    ChartTheme,
    set_theme,
    get_theme,
)

SID = "test-session"


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
        set_theme(SID, "meli_light")
        assert get_theme(SID).name == "meli_light"

        set_theme(SID, "meli_dark")
        assert get_theme(SID).name == "meli_dark"

    def test_set_theme_invalid(self):
        """set_theme should raise for invalid theme."""
        with pytest.raises(ValueError, match="Unknown theme"):
            set_theme(SID, "invalid_theme")


class TestGetTheme:
    """Tests for get_theme function."""

    def test_get_theme_returns_current(self):
        """get_theme should return current theme."""
        set_theme(SID, "meli_yellow")
        theme = get_theme(SID)
        assert theme.name == "meli_yellow"
        assert isinstance(theme, ChartTheme)
