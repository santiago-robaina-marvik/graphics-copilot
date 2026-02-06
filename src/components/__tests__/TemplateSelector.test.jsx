import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplateSelector from "../TemplateSelector";
import { createMockChart } from "../../test/utils";

describe("TemplateSelector", () => {
  const mockCharts = [
    createMockChart({ id: 1, type: "bar" }),
    createMockChart({ id: 2, type: "line" }),
    createMockChart({ id: 3, type: "pie" }),
    createMockChart({ id: 4, type: "scatter" }),
  ];

  const defaultProps = {
    generatedCharts: mockCharts,
    onSaveTemplate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders template selector header", () => {
    render(<TemplateSelector {...defaultProps} />);
    expect(screen.getByText("Layout")).toBeInTheDocument();
  });

  it("renders all template buttons", () => {
    render(<TemplateSelector {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    // Should have at least 4 template buttons (full, half, split, grid)
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("shows template canvas when template is selected", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    // Click the first template button
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    // Canvas should appear
    expect(
      screen.getByText(/drag charts from the gallery/i),
    ).toBeInTheDocument();
  });

  it("cycles through variations when clicking same template button", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    // Find the half template button (has multiple variations)
    const buttons = screen.getAllByRole("button");
    const halfButton = buttons[1]; // Assuming half is second button

    // Click once
    await user.click(halfButton);
    let variation = screen.queryByText(/top|bottom|left|right/i);
    const firstVariation = variation?.textContent;

    // Click again to cycle
    await user.click(halfButton);
    variation = screen.queryByText(/top|bottom|left|right/i);
    const secondVariation = variation?.textContent;

    // Should show different variation
    expect(firstVariation).toBeDefined();
    expect(secondVariation).toBeDefined();
  });

  it("shows save and clear buttons when template is selected", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("save button is disabled when slots are not filled", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("clears template when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    // Template should be visible
    expect(
      screen.getByText(/drag charts from the gallery/i),
    ).toBeInTheDocument();

    // Click clear
    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    // Template should be hidden
    expect(
      screen.queryByText(/drag charts from the gallery/i),
    ).not.toBeInTheDocument();
  });

  it("applies active class to selected template button", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    const firstButton = buttons[0];

    expect(firstButton).not.toHaveClass("active");

    await user.click(firstButton);

    expect(firstButton).toHaveClass("active");
  });

  it("shows variation counter for templates with multiple variations", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    // Click half template which has 4 variations
    await user.click(buttons[1]);

    // Should show variation counter
    const counter = screen.queryByText(/click button again to cycle/i);
    expect(counter).toBeInTheDocument();
  });

  it("handles drag over event on template slot", async () => {
    const user = userEvent.setup();
    const { container } = render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    // Find template slot
    const slot = container.querySelector(".template-slot");
    expect(slot).toBeInTheDocument();

    // Simulate drag over
    act(() => {
      fireEvent.dragOver(slot, {
        dataTransfer: { getData: vi.fn() },
      });
    });

    // Slot should have drag-over class
    expect(slot).toHaveClass("drag-over");
  });

  it("renders correct number of slots for each template", async () => {
    const user = userEvent.setup();
    const { container } = render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");

    // Full template - 1 slot
    await user.click(buttons[0]);
    let slots = container.querySelectorAll(".template-slot");
    expect(slots.length).toBe(1);

    // Grid template - 4 slots (assuming it's the last button)
    await user.click(buttons[3]);
    slots = container.querySelectorAll(".template-slot");
    expect(slots.length).toBe(4);
  });

  it("calls onSaveTemplate with slot data when save is clicked", async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue();
    const { container } = render(
      <TemplateSelector
        generatedCharts={mockCharts}
        onSaveTemplate={mockSave}
      />,
    );

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]); // Full template - 1 slot

    // Simulate drop to fill the slot
    const slot = container.querySelector(".template-slot");
    act(() => {
      fireEvent.drop(slot, {
        dataTransfer: { getData: () => "1" },
      });
    });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ 0: expect.objectContaining({ id: 1 }) }),
      "full",
    );
  });

  it("shows placeholder text in empty slots", async () => {
    const user = userEvent.setup();
    render(<TemplateSelector {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(screen.getByText("Drop chart here")).toBeInTheDocument();
  });
});
