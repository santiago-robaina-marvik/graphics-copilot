"""Tests for app/logging_config.py"""

import logging

from app.logging_config import ColoredFormatter, setup_logging, get_logger, Colors


class TestColoredFormatter:
    """Tests for ColoredFormatter class."""

    def test_format_adds_colors(self):
        """ColoredFormatter should add color codes to output."""
        formatter = ColoredFormatter()
        record = logging.LogRecord(
            name="app.agent",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        formatted = formatter.format(record)

        # Should contain color codes
        assert Colors.CYAN in formatted or "agent" in formatted.lower()

    def test_format_different_levels(self):
        """ColoredFormatter should use different colors for different levels."""
        formatter = ColoredFormatter()

        info_record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="",
            lineno=1,
            msg="info",
            args=(),
            exc_info=None,
        )
        error_record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="",
            lineno=1,
            msg="error",
            args=(),
            exc_info=None,
        )

        info_formatted = formatter.format(info_record)
        error_formatted = formatter.format(error_record)

        # Different levels should have different formatting
        assert info_formatted != error_formatted


class TestSetupLogging:
    """Tests for setup_logging function."""

    def test_setup_logging_configures_loggers(self):
        """setup_logging should configure app loggers."""
        setup_logging("DEBUG")
        logger = logging.getLogger("app")

        assert logger.level == logging.DEBUG
        assert len(logger.handlers) > 0


class TestGetLogger:
    """Tests for get_logger function."""

    def test_get_logger_returns_logger(self):
        """get_logger should return a logging.Logger instance."""
        logger = get_logger("test.module")

        assert isinstance(logger, logging.Logger)
        assert logger.name == "test.module"
