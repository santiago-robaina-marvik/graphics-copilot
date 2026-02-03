"""Chart theme definitions for Mercado Libre branded charts."""

from dataclasses import dataclass


@dataclass
class ChartTheme:
    """Defines colors and styling for chart generation."""

    name: str
    display_name: str
    figure_facecolor: str
    axes_facecolor: str
    text_color: str
    grid_color: str
    edge_color: str
    palette: list[str]


THEMES: dict[str, ChartTheme] = {
    "meli_dark": ChartTheme(
        name="meli_dark",
        display_name="Meli Dark",
        figure_facecolor="#0B0C20",
        axes_facecolor="#0B0C20",
        text_color="#A5A8AD",
        grid_color="#2a2a38",
        edge_color="#2a2a38",
        palette=["#3483FA", "#FFE600", "#1679ED", "#2860F6", "#00E5FF", "#00A650"],
    ),
    "meli_light": ChartTheme(
        name="meli_light",
        display_name="Meli Light",
        figure_facecolor="#FFFFFF",
        axes_facecolor="#FFFFFF",
        text_color="#333333",
        grid_color="#E5E5E5",
        edge_color="#E5E5E5",
        palette=["#3483FA", "#2D3277", "#FFE600", "#1679ED", "#00A650", "#F23D4F"],
    ),
    "meli_yellow": ChartTheme(
        name="meli_yellow",
        display_name="Meli Yellow",
        figure_facecolor="#FFFFFF",
        axes_facecolor="#FFFFFF",
        text_color="#2D3277",
        grid_color="#E5E5E5",
        edge_color="#E5E5E5",
        palette=["#2D3277", "#3483FA", "#0B0C20", "#005CC6", "#06255E", "#333333"],
    ),
}

_current_theme: str = "meli_dark"


def set_theme(name: str) -> None:
    """Set the current chart theme by name."""
    global _current_theme
    if name not in THEMES:
        raise ValueError(f"Unknown theme: {name}. Available: {list(THEMES.keys())}")
    _current_theme = name


def get_theme() -> ChartTheme:
    """Get the current chart theme."""
    return THEMES[_current_theme]


def get_available_themes() -> list[dict]:
    """Get list of available themes with metadata."""
    return [
        {
            "name": theme.name,
            "display_name": theme.display_name,
            "background": theme.figure_facecolor,
            "text_color": theme.text_color,
            "palette": theme.palette,
        }
        for theme in THEMES.values()
    ]
