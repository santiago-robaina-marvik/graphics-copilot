"""Compose multiple chart images into layout grids using Pillow."""

import json
from pathlib import Path

from PIL import Image

# Load standard image dimensions from shared config
_config_path = Path(__file__).resolve().parents[3] / "image-config.json"
with open(_config_path) as _f:
    _image_config = json.load(_f)

CANVAS_WIDTH = _image_config["width_px"]  # 1181
CANVAS_HEIGHT = _image_config["height_px"]  # 650
PADDING = 8
GAP = 8


def _calculate_slots(layout_type: str) -> list[dict]:
    """Calculate slot positions for a given layout type.

    Returns list of dicts with keys: x, y, width, height.
    """
    content_w = CANVAS_WIDTH - 2 * PADDING
    content_h = CANVAS_HEIGHT - 2 * PADDING

    # Two-column slot width (accounts for gap)
    half_w = (content_w - GAP) // 2
    # Two-row slot height (accounts for gap)
    half_h = (content_h - GAP) // 2
    # Second column/row start position
    col2_x = PADDING + half_w + GAP
    row2_y = PADDING + half_h + GAP

    layouts = {
        "full": [
            {"x": PADDING, "y": PADDING, "width": content_w, "height": content_h},
        ],
        "half-top": [
            {"x": PADDING, "y": PADDING, "width": content_w, "height": half_h},
        ],
        "half-bottom": [
            {"x": PADDING, "y": row2_y, "width": content_w, "height": half_h},
        ],
        "half-left": [
            {"x": PADDING, "y": PADDING, "width": half_w, "height": content_h},
        ],
        "half-right": [
            {"x": col2_x, "y": PADDING, "width": half_w, "height": content_h},
        ],
        "split-horizontal": [
            {"x": PADDING, "y": PADDING, "width": half_w, "height": content_h},
            {"x": col2_x, "y": PADDING, "width": half_w, "height": content_h},
        ],
        "split-vertical": [
            {"x": PADDING, "y": PADDING, "width": content_w, "height": half_h},
            {"x": PADDING, "y": row2_y, "width": content_w, "height": half_h},
        ],
        "grid": [
            {"x": PADDING, "y": PADDING, "width": half_w, "height": half_h},
            {"x": col2_x, "y": PADDING, "width": half_w, "height": half_h},
            {"x": PADDING, "y": row2_y, "width": half_w, "height": half_h},
            {"x": col2_x, "y": row2_y, "width": half_w, "height": half_h},
        ],
    }

    if layout_type not in layouts:
        raise ValueError(f"Unknown layout type: {layout_type}")

    return layouts[layout_type]


def get_slot_count(layout_type: str) -> int:
    """Return the number of slots for a layout type."""
    return len(_calculate_slots(layout_type))


VALID_LAYOUT_TYPES = [
    "full",
    "half-top",
    "half-bottom",
    "half-left",
    "half-right",
    "split-horizontal",
    "split-vertical",
    "grid",
]


def compose_layout(layout_type: str, chart_paths: list[Path]) -> Image.Image:
    """Compose chart images into a layout grid.

    Args:
        layout_type: Layout template type (e.g., "grid", "split-horizontal")
        chart_paths: Ordered list of chart image file paths, one per slot

    Returns:
        Composed PIL Image (RGBA)

    Raises:
        ValueError: If layout_type is invalid or chart count doesn't match slot count
        FileNotFoundError: If a chart image file doesn't exist
    """
    slots = _calculate_slots(layout_type)

    if len(chart_paths) != len(slots):
        raise ValueError(
            f"Layout '{layout_type}' requires {len(slots)} charts, "
            f"got {len(chart_paths)}"
        )

    # Create transparent canvas
    canvas = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 0))

    for slot, chart_path in zip(slots, chart_paths):
        if not chart_path.exists():
            raise FileNotFoundError(f"Chart image not found: {chart_path}")

        chart_img = Image.open(chart_path).convert("RGBA")

        slot_w = slot["width"]
        slot_h = slot["height"]

        # Scale to fit slot while maintaining aspect ratio (contain behavior)
        scale = min(slot_w / chart_img.width, slot_h / chart_img.height)
        new_w = int(chart_img.width * scale)
        new_h = int(chart_img.height * scale)
        chart_img = chart_img.resize((new_w, new_h), Image.LANCZOS)

        # Center within slot
        x = slot["x"] + (slot_w - new_w) // 2
        y = slot["y"] + (slot_h - new_h) // 2

        canvas.paste(chart_img, (x, y), chart_img)

    return canvas
