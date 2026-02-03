import matplotlib

matplotlib.use("Agg")  # Non-interactive backend

import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime
from langchain_core.tools import tool

from app.agent.tools.dataframe import get_dataframe
from app.agent.tools.themes import get_theme
from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger("app.agent.tools.plotting")


def _save_chart() -> str:
    """Save current matplotlib figure and return the URL path."""
    settings = get_settings()
    theme = get_theme()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"chart_{timestamp}.png"
    filepath = Path(settings.charts_dir) / filename

    plt.tight_layout()
    plt.savefig(
        filepath,
        dpi=150,
        bbox_inches="tight",
        facecolor=theme.figure_facecolor,
        edgecolor="none",
    )
    plt.close()

    logger.info(f"Chart saved: {filepath}")
    return f"/static/charts/{filename}"


def _apply_theme():
    """Apply the current chart theme to matplotlib."""
    theme = get_theme()

    # Use dark_background as base for dark themes, default for light
    if theme.figure_facecolor in ("#0B0C20", "#1a1a24"):
        plt.style.use("dark_background")
    else:
        plt.style.use("default")

    plt.rcParams.update(
        {
            "figure.facecolor": theme.figure_facecolor,
            "axes.facecolor": theme.axes_facecolor,
            "axes.edgecolor": theme.edge_color,
            "axes.labelcolor": theme.text_color,
            "text.color": theme.text_color,
            "xtick.color": theme.text_color,
            "ytick.color": theme.text_color,
            "grid.color": theme.grid_color,
            "figure.figsize": (10, 6),
        }
    )


@tool
def create_bar_chart(x_column: str, y_column: str, title: str = "Bar Chart") -> str:
    """
    Create a bar chart from the current dataset.

    Args:
        x_column: Column for x-axis (categories)
        y_column: Column for y-axis (values)
        title: Chart title
    """
    logger.info(
        f"Tool: create_bar_chart(x='{x_column}', y='{y_column}', title='{title}')"
    )
    df = get_dataframe()
    if df is None:
        logger.warning("No data loaded for bar chart")
        return "No data loaded. Cannot create chart."

    if x_column not in df.columns or y_column not in df.columns:
        logger.warning("Column not found for bar chart")
        return f"Column not found. Available: {list(df.columns)}"

    _apply_theme()
    theme = get_theme()
    fig, ax = plt.subplots()

    # Cycle through theme palette colors
    colors = theme.palette * ((len(df) // len(theme.palette)) + 1)
    ax.bar(df[x_column].astype(str), df[y_column], color=colors[: len(df)])

    ax.set_xlabel(x_column)
    ax.set_ylabel(y_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)
    plt.xticks(rotation=45, ha="right")

    chart_url = _save_chart()
    logger.info(f"Bar chart created with {len(df)} bars")
    return f"Bar chart created: {chart_url}"


@tool
def create_line_chart(x_column: str, y_column: str, title: str = "Line Chart") -> str:
    """
    Create a line chart from the current dataset. Good for trends over time.

    Args:
        x_column: Column for x-axis (usually time/sequence)
        y_column: Column for y-axis (values)
        title: Chart title
    """
    logger.info(
        f"Tool: create_line_chart(x='{x_column}', y='{y_column}', title='{title}')"
    )
    df = get_dataframe()
    if df is None:
        logger.warning("No data loaded for line chart")
        return "No data loaded. Cannot create chart."

    if x_column not in df.columns or y_column not in df.columns:
        logger.warning("Column not found for line chart")
        return f"Column not found. Available: {list(df.columns)}"

    _apply_theme()
    theme = get_theme()
    fig, ax = plt.subplots()

    primary_color = theme.palette[0]
    ax.plot(
        df[x_column].astype(str),
        df[y_column],
        color=primary_color,
        linewidth=2,
        marker="o",
        markersize=6,
    )
    ax.fill_between(range(len(df)), df[y_column], alpha=0.3, color=primary_color)

    ax.set_xlabel(x_column)
    ax.set_ylabel(y_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)
    plt.xticks(rotation=45, ha="right")
    ax.grid(True, alpha=0.3)

    chart_url = _save_chart()
    logger.info(f"Line chart created with {len(df)} points")
    return f"Line chart created: {chart_url}"


@tool
def create_pie_chart(
    labels_column: str, values_column: str, title: str = "Pie Chart"
) -> str:
    """
    Create a pie chart showing distribution/proportions.

    Args:
        labels_column: Column for slice labels
        values_column: Column for slice values
        title: Chart title
    """
    logger.info(
        f"Tool: create_pie_chart(labels='{labels_column}', values='{values_column}', title='{title}')"
    )
    df = get_dataframe()
    if df is None:
        logger.warning("No data loaded for pie chart")
        return "No data loaded. Cannot create chart."

    if labels_column not in df.columns or values_column not in df.columns:
        logger.warning("Column not found for pie chart")
        return f"Column not found. Available: {list(df.columns)}"

    # Limit to top 10 for readability
    plot_df = df.nlargest(10, values_column) if len(df) > 10 else df

    _apply_theme()
    theme = get_theme()
    fig, ax = plt.subplots()

    # Extend palette if needed for pie slices
    colors = theme.palette * ((len(plot_df) // len(theme.palette)) + 1)

    wedges, texts, autotexts = ax.pie(
        plot_df[values_column],
        labels=plot_df[labels_column],
        colors=colors[: len(plot_df)],
        autopct="%1.1f%%",
        pctdistance=0.75,
        textprops={"color": theme.text_color, "fontsize": 10},
    )

    ax.set_title(title, color=theme.text_color, fontsize=14)

    chart_url = _save_chart()
    logger.info(f"Pie chart created with {len(plot_df)} slices")
    return f"Pie chart created: {chart_url}"


@tool
def create_area_chart(x_column: str, y_column: str, title: str = "Area Chart") -> str:
    """
    Create an area chart (filled line chart). Good for volume/cumulative data.

    Args:
        x_column: Column for x-axis
        y_column: Column for y-axis (values)
        title: Chart title
    """
    logger.info(
        f"Tool: create_area_chart(x='{x_column}', y='{y_column}', title='{title}')"
    )
    df = get_dataframe()
    if df is None:
        logger.warning("No data loaded for area chart")
        return "No data loaded. Cannot create chart."

    if x_column not in df.columns or y_column not in df.columns:
        logger.warning("Column not found for area chart")
        return f"Column not found. Available: {list(df.columns)}"

    _apply_theme()
    theme = get_theme()
    fig, ax = plt.subplots()

    primary_color = theme.palette[0]
    secondary_color = theme.palette[1] if len(theme.palette) > 1 else primary_color

    x_vals = range(len(df))
    ax.fill_between(x_vals, df[y_column], alpha=0.7, color=primary_color)
    ax.plot(x_vals, df[y_column], color=secondary_color, linewidth=2)

    ax.set_xticks(x_vals)
    ax.set_xticklabels(df[x_column].astype(str), rotation=45, ha="right")
    ax.set_xlabel(x_column)
    ax.set_ylabel(y_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)
    ax.grid(True, alpha=0.3)

    chart_url = _save_chart()
    logger.info(f"Area chart created with {len(df)} points")
    return f"Area chart created: {chart_url}"


# Collect all plotting tools
plotting_tools = [
    create_bar_chart,
    create_line_chart,
    create_pie_chart,
    create_area_chart,
]
