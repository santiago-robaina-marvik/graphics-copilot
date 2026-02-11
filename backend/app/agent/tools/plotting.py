import json
import matplotlib

matplotlib.use("Agg")  # Non-interactive backend

import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.agent.tools.dataframe import get_dataframe, get_data_source
from app.agent.tools.themes import get_theme
from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger("app.agent.tools.plotting")

# Load standard image dimensions from shared config
_config_path = Path(__file__).resolve().parents[4] / "image-config.json"
with open(_config_path) as _f:
    _image_config = json.load(_f)

CHART_WIDTH_PX = _image_config["width_px"]
CHART_HEIGHT_PX = _image_config["height_px"]
CHART_DPI = _image_config["dpi"]
CHART_FIGSIZE = (CHART_WIDTH_PX / CHART_DPI, CHART_HEIGHT_PX / CHART_DPI)


def _save_chart(session_id: str, metadata: dict) -> tuple[str, dict]:
    """Save current matplotlib figure and metadata, return the URL path and metadata."""
    settings = get_settings()
    theme = get_theme(session_id)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"chart_{timestamp}.png"
    filepath = Path(settings.charts_dir) / filename

    plt.tight_layout()
    plt.savefig(
        filepath,
        dpi=CHART_DPI,
        facecolor=theme.figure_facecolor,
        edgecolor="none",
    )
    plt.close()

    # Save metadata sidecar file
    chart_url = f"/static/charts/{filename}"
    full_metadata = {
        **metadata,
        "theme": theme.name,
        "created_at": datetime.now().isoformat(),
        "chart_url": chart_url,
    }

    metadata_path = filepath.with_suffix(".json")
    with open(metadata_path, "w") as f:
        json.dump(full_metadata, f, indent=2)

    logger.info(f"Chart saved: {filepath}")
    logger.info(f"Metadata saved: {metadata_path}")

    return chart_url, full_metadata


def _apply_theme(session_id: str):
    """Apply the current chart theme to matplotlib and seaborn."""
    theme = get_theme(session_id)

    # Use dark_background as base for dark themes, default for light
    if theme.figure_facecolor in ("#0B0C20", "#1a1a24"):
        plt.style.use("dark_background")
    else:
        plt.style.use("default")

    # Apply theme to matplotlib rcParams
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
            "figure.figsize": CHART_FIGSIZE,
        }
    )

    # Set seaborn palette from theme
    sns.set_palette(theme.palette)


@tool
def create_bar_chart(x_column: str, y_column: str, config: RunnableConfig, title: str = "Bar Chart") -> str:
    """
    Create a bar chart from the current dataset.

    Args:
        x_column: Column for x-axis (categories)
        y_column: Column for y-axis (values)
        title: Chart title
    """
    logger.info(f"Tool: create_bar_chart(x='{x_column}', y='{y_column}', title='{title}')")
    session_id = config["configurable"]["thread_id"]
    df = get_dataframe(session_id)
    if df is None:
        logger.warning("No data loaded for bar chart")
        return "No data loaded. Cannot create chart."

    if x_column not in df.columns or y_column not in df.columns:
        logger.warning("Column not found for bar chart")
        return f"Column not found. Available: {list(df.columns)}"

    _apply_theme(session_id)
    theme = get_theme(session_id)
    fig, ax = plt.subplots()

    # Use seaborn barplot
    sns.barplot(
        data=df,
        x=x_column,
        y=y_column,
        hue=x_column,
        palette=theme.palette,
        legend=False,
        ax=ax,
    )

    ax.set_xlabel(x_column)
    ax.set_ylabel(y_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)
    plt.xticks(rotation=45, ha="right")

    data_source = get_data_source(session_id)
    metadata = {
        "chart_type": "bar",
        "x_column": x_column,
        "y_column": y_column,
        "title": title,
        "row_count": len(df),
    }
    if data_source:
        metadata["data_source"] = data_source
    chart_url, _ = _save_chart(session_id, metadata)
    logger.info(f"Bar chart created with {len(df)} bars")
    return f"Bar chart created: {chart_url}"


@tool
def create_line_chart(x_column: str, y_column: str, config: RunnableConfig, title: str = "Line Chart") -> str:
    """
    Create a line chart from the current dataset. Good for trends over time.

    Args:
        x_column: Column for x-axis (usually time/sequence)
        y_column: Column for y-axis (values)
        title: Chart title
    """
    logger.info(f"Tool: create_line_chart(x='{x_column}', y='{y_column}', title='{title}')")
    session_id = config["configurable"]["thread_id"]
    df = get_dataframe(session_id)
    if df is None:
        logger.warning("No data loaded for line chart")
        return "No data loaded. Cannot create chart."

    if x_column not in df.columns or y_column not in df.columns:
        logger.warning("Column not found for line chart")
        return f"Column not found. Available: {list(df.columns)}"

    _apply_theme(session_id)
    theme = get_theme(session_id)
    fig, ax = plt.subplots()

    # Use seaborn lineplot with markers
    sns.lineplot(
        data=df,
        x=x_column,
        y=y_column,
        marker="o",
        markersize=6,
        linewidth=2,
        color=theme.palette[0],
        ax=ax,
    )

    ax.set_xlabel(x_column)
    ax.set_ylabel(y_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)
    plt.xticks(rotation=45, ha="right")
    ax.grid(True, alpha=0.3)

    data_source = get_data_source(session_id)
    metadata = {
        "chart_type": "line",
        "x_column": x_column,
        "y_column": y_column,
        "title": title,
        "row_count": len(df),
    }
    if data_source:
        metadata["data_source"] = data_source
    chart_url, _ = _save_chart(session_id, metadata)
    logger.info(f"Line chart created with {len(df)} points")
    return f"Line chart created: {chart_url}"


@tool
def create_distribution_chart(
    labels_column: str, values_column: str, config: RunnableConfig, title: str = "Distribution Chart"
) -> str:
    """
    Create a horizontal bar chart showing distribution/proportions.
    Shows percentages for each category. Good for comparing parts of a whole.

    Args:
        labels_column: Column for category labels
        values_column: Column for values
        title: Chart title
    """
    logger.info(f"Tool: create_distribution_chart(labels='{labels_column}', values='{values_column}', title='{title}')")
    session_id = config["configurable"]["thread_id"]
    df = get_dataframe(session_id)
    if df is None:
        logger.warning("No data loaded for distribution chart")
        return "No data loaded. Cannot create chart."

    if labels_column not in df.columns or values_column not in df.columns:
        logger.warning("Column not found for distribution chart")
        return f"Column not found. Available: {list(df.columns)}"

    # Limit to top 10 for readability
    plot_df = df.nlargest(10, values_column) if len(df) > 10 else df.copy()

    # Calculate percentages
    total = plot_df[values_column].sum()
    plot_df = plot_df.copy()
    plot_df["_percentage"] = (plot_df[values_column] / total * 100).round(1)

    _apply_theme(session_id)
    theme = get_theme(session_id)
    fig, ax = plt.subplots()

    # Use seaborn horizontal barplot for proportions
    sns.barplot(
        data=plot_df,
        y=labels_column,
        x=values_column,
        hue=labels_column,
        palette=theme.palette,
        legend=False,
        ax=ax,
    )

    # Add percentage labels
    for i, (value, pct) in enumerate(zip(plot_df[values_column], plot_df["_percentage"])):
        ax.text(value + total * 0.01, i, f"{pct}%", va="center", color=theme.text_color)

    ax.set_xlabel(values_column)
    ax.set_ylabel(labels_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)

    data_source = get_data_source(session_id)
    metadata = {
        "chart_type": "distribution",
        "labels_column": labels_column,
        "values_column": values_column,
        "title": title,
        "row_count": len(plot_df),
    }
    if data_source:
        metadata["data_source"] = data_source
    chart_url, _ = _save_chart(session_id, metadata)
    logger.info(f"Distribution chart created with {len(plot_df)} categories")
    return f"Distribution chart created: {chart_url}"


@tool
def create_area_chart(x_column: str, y_column: str, config: RunnableConfig, title: str = "Area Chart") -> str:
    """
    Create an area chart (filled line chart). Good for volume/cumulative data.

    Args:
        x_column: Column for x-axis
        y_column: Column for y-axis (values)
        title: Chart title
    """
    logger.info(f"Tool: create_area_chart(x='{x_column}', y='{y_column}', title='{title}')")
    session_id = config["configurable"]["thread_id"]
    df = get_dataframe(session_id)
    if df is None:
        logger.warning("No data loaded for area chart")
        return "No data loaded. Cannot create chart."

    if x_column not in df.columns or y_column not in df.columns:
        logger.warning("Column not found for area chart")
        return f"Column not found. Available: {list(df.columns)}"

    _apply_theme(session_id)
    theme = get_theme(session_id)
    fig, ax = plt.subplots()

    # Use seaborn lineplot and fill
    sns.lineplot(
        data=df,
        x=x_column,
        y=y_column,
        color=theme.palette[1] if len(theme.palette) > 1 else theme.palette[0],
        linewidth=2,
        ax=ax,
    )

    # Fill area under the line
    ax.fill_between(
        range(len(df)),
        df[y_column],
        alpha=0.7,
        color=theme.palette[0],
    )

    ax.set_xticks(range(len(df)))
    ax.set_xticklabels(df[x_column].astype(str), rotation=45, ha="right")
    ax.set_xlabel(x_column)
    ax.set_ylabel(y_column)
    ax.set_title(title, color=theme.text_color, fontsize=14)
    ax.grid(True, alpha=0.3)

    data_source = get_data_source(session_id)
    metadata = {
        "chart_type": "area",
        "x_column": x_column,
        "y_column": y_column,
        "title": title,
        "row_count": len(df),
    }
    if data_source:
        metadata["data_source"] = data_source
    chart_url, _ = _save_chart(session_id, metadata)
    logger.info(f"Area chart created with {len(df)} points")
    return f"Area chart created: {chart_url}"


# Collect all plotting tools
plotting_tools = [
    create_bar_chart,
    create_line_chart,
    create_distribution_chart,  # renamed from create_pie_chart
    create_area_chart,
]
