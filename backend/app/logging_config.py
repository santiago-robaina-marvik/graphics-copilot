import logging
import sys


# ANSI color codes for terminal output
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    # Colors
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    MAGENTA = "\033[35m"
    BLUE = "\033[34m"


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different log levels and components."""

    LEVEL_COLORS = {
        logging.DEBUG: Colors.DIM,
        logging.INFO: Colors.GREEN,
        logging.WARNING: Colors.YELLOW,
        logging.ERROR: Colors.RED,
        logging.CRITICAL: Colors.RED + Colors.BOLD,
    }

    MODULE_COLORS = {
        "agent": Colors.CYAN,
        "tools": Colors.MAGENTA,
        "routes": Colors.BLUE,
        "dataframe": Colors.MAGENTA,
        "plotting": Colors.MAGENTA,
    }

    def format(self, record):
        # Color based on log level
        level_color = self.LEVEL_COLORS.get(record.levelno, Colors.RESET)

        # Color based on module name
        module_color = Colors.RESET
        for key, color in self.MODULE_COLORS.items():
            if key in record.name.lower():
                module_color = color
                break

        # Format the message
        timestamp = self.formatTime(record, "%H:%M:%S")
        level = record.levelname.ljust(8)
        name = record.name.split(".")[-1].ljust(12)

        formatted = (
            f"{Colors.DIM}{timestamp}{Colors.RESET} "
            f"{level_color}{level}{Colors.RESET} "
            f"{module_color}{name}{Colors.RESET} "
            f"{record.getMessage()}"
        )

        if record.exc_info:
            formatted += "\n" + self.formatException(record.exc_info)

        return formatted


def setup_logging(level: str = "INFO"):
    """Configure logging for the application."""

    # Create handler that writes to stderr (uvicorn default)
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(ColoredFormatter())

    # Set up app-specific loggers with our handler
    app_loggers = [
        "app",
        "app.main",
        "app.agent.graph",
        "app.agent.tools.dataframe",
        "app.agent.tools.plotting",
        "app.api.routes",
    ]

    for logger_name in app_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(getattr(logging, level.upper()))
        logger.handlers = []
        logger.addHandler(handler)
        logger.propagate = False  # Don't propagate to root logger

    # Suppress noisy third-party loggers
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    return logging.getLogger("app")


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a specific module."""
    return logging.getLogger(name)
