"""Tests for app/config.py"""

import pytest
from unittest.mock import patch
import os


class TestSettings:
    """Tests for Settings class."""

    def test_settings_loads_from_env(self):
        """Settings should load GEMINI_API_KEY from environment."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key-123"}):
            from app.config import Settings

            settings = Settings()
            assert settings.gemini_api_key == "test-key-123"

    def test_settings_default_model(self):
        """Settings should have default gemini_model."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
            from app.config import Settings

            settings = Settings()
            assert settings.gemini_model == "gemini-3-flash-preview"

    def test_settings_default_charts_dir(self):
        """Settings should have default charts_dir."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
            from app.config import Settings

            settings = Settings()
            assert settings.charts_dir == "static/charts"

    def test_settings_missing_api_key_raises(self):
        """Settings should raise error when GEMINI_API_KEY is missing."""
        # Pydantic Settings validates fields, so missing required field raises ValidationError
        from app.config import Settings
        from pydantic import ValidationError

        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValidationError):
                Settings(_env_file=None)


class TestGetSettings:
    """Tests for get_settings function."""

    def test_get_settings_returns_singleton(self):
        """get_settings should return cached instance."""
        from app.config import get_settings

        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2
