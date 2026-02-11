"""Chart theme definitions for Mercado Libre branded charts."""

from dataclasses import dataclass

from app.agent.session_state import get_session


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


def set_theme(session_id: str, name: str) -> None:
    """Set the current chart theme by name."""
    if name not in THEMES:
        raise ValueError(f"Unknown theme: {name}. Available: {list(THEMES.keys())}")
    get_session(session_id).theme = name


def get_theme(session_id: str) -> ChartTheme:
    """Get the current chart theme."""
    return THEMES[get_session(session_id).theme]
