"""Tests for the layout composition module."""

import pytest
from PIL import Image

from app.utils.layout_composer import (
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    VALID_LAYOUT_TYPES,
    _calculate_slots,
    compose_layout,
    get_slot_count,
)


@pytest.fixture
def sample_chart(tmp_path):
    """Create a sample chart image for testing."""
    img = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (100, 150, 200, 255))
    path = tmp_path / "chart_test_001.png"
    img.save(path, "PNG")
    return path


@pytest.fixture
def make_chart(tmp_path):
    """Factory fixture to create multiple chart images."""

    def _make(index, color=(100, 150, 200, 255)):
        img = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), color)
        path = tmp_path / f"chart_test_{index:03d}.png"
        img.save(path, "PNG")
        return path

    return _make


class TestCalculateSlots:
    """Test slot position calculations."""

    def test_full_layout_has_one_slot(self):
        slots = _calculate_slots("full")
        assert len(slots) == 1

    def test_split_horizontal_has_two_slots(self):
        slots = _calculate_slots("split-horizontal")
        assert len(slots) == 2

    def test_split_vertical_has_two_slots(self):
        slots = _calculate_slots("split-vertical")
        assert len(slots) == 2

    def test_grid_has_four_slots(self):
        slots = _calculate_slots("grid")
        assert len(slots) == 4

    def test_half_layouts_have_one_slot(self):
        for layout in ["half-top", "half-bottom", "half-left", "half-right"]:
            slots = _calculate_slots(layout)
            assert len(slots) == 1, f"{layout} should have 1 slot"

    def test_invalid_layout_raises(self):
        with pytest.raises(ValueError, match="Unknown layout type"):
            _calculate_slots("nonexistent")

    def test_slots_within_canvas_bounds(self):
        for layout_type in VALID_LAYOUT_TYPES:
            slots = _calculate_slots(layout_type)
            for slot in slots:
                assert slot["x"] >= 0
                assert slot["y"] >= 0
                assert slot["x"] + slot["width"] <= CANVAS_WIDTH
                assert slot["y"] + slot["height"] <= CANVAS_HEIGHT

    def test_split_horizontal_slots_dont_overlap(self):
        slots = _calculate_slots("split-horizontal")
        # Slot 1 should start after slot 0 ends + gap
        assert slots[1]["x"] > slots[0]["x"] + slots[0]["width"]

    def test_grid_slots_dont_overlap(self):
        slots = _calculate_slots("grid")
        # Columns don't overlap
        assert slots[1]["x"] > slots[0]["x"] + slots[0]["width"]
        # Rows don't overlap
        assert slots[2]["y"] > slots[0]["y"] + slots[0]["height"]


class TestGetSlotCount:
    """Test slot count helper."""

    def test_full_is_1(self):
        assert get_slot_count("full") == 1

    def test_split_is_2(self):
        assert get_slot_count("split-horizontal") == 2

    def test_grid_is_4(self):
        assert get_slot_count("grid") == 4


class TestComposeLayout:
    """Test image composition."""

    def test_compose_full_layout(self, sample_chart):
        result = compose_layout("full", [sample_chart])
        assert result.size == (CANVAS_WIDTH, CANVAS_HEIGHT)
        assert result.mode == "RGBA"

    def test_compose_split_horizontal(self, make_chart):
        charts = [make_chart(0, (255, 0, 0, 255)), make_chart(1, (0, 0, 255, 255))]
        result = compose_layout("split-horizontal", charts)
        assert result.size == (CANVAS_WIDTH, CANVAS_HEIGHT)

    def test_compose_grid_layout(self, make_chart):
        charts = [make_chart(i) for i in range(4)]
        result = compose_layout("grid", charts)
        assert result.size == (CANVAS_WIDTH, CANVAS_HEIGHT)

    def test_wrong_chart_count_raises(self, sample_chart):
        with pytest.raises(ValueError, match="requires 4 charts"):
            compose_layout("grid", [sample_chart])

    def test_missing_chart_file_raises(self, tmp_path):
        missing = tmp_path / "chart_missing.png"
        with pytest.raises(FileNotFoundError, match="not found"):
            compose_layout("full", [missing])

    def test_transparent_background(self, sample_chart):
        result = compose_layout("full", [sample_chart])
        # Corner pixel (0,0) is in the padding area and should be transparent
        pixel = result.getpixel((0, 0))
        assert pixel[3] == 0  # Alpha channel is 0 (transparent)

    def test_chart_is_centered_in_slot(self, make_chart):
        """Verify chart content is centered within its slot."""
        chart = make_chart(0, (255, 0, 0, 255))
        result = compose_layout("full", [chart])

        # The chart should be placed within the slot, centered
        # Check that there's content in the center area
        center_x, center_y = CANVAS_WIDTH // 2, CANVAS_HEIGHT // 2
        center_pixel = result.getpixel((center_x, center_y))
        assert center_pixel[3] > 0  # Should have content at center
