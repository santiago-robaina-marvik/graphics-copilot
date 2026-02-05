import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AISidebar from "../AISidebar";

vi.mock("../../services/api", () => ({
  sendChatMessage: vi.fn(),
  getChartImageUrl: vi.fn((url) => `http://localhost:8000${url}`),
  getOrCreateSessionId: vi.fn(() => "test-session"),
  resetSession: vi.fn(),
  regenerateChart: vi.fn(),
}));

describe("AISidebar Chart Regeneration", () => {
  const defaultProps = {
    isOpen: true,
    onChartGenerated: vi.fn(),
    onChartDeleted: vi.fn(),
    generatedCharts: [],
    userData: [{ category: "A", value: 10 }],
    chartTheme: "meli_dark",
    onThemeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should show regenerate button only for charts with metadata", async () => {
    const user = userEvent.setup();
    const charts = [
      {
        id: 1,
        type: "bar",
        imageUrl: "http://localhost:8000/static/charts/chart_1.png",
        metadata: {
          chart_type: "bar",
          x_column: "category",
          y_column: "value",
        },
      },
      {
        id: 2,
        type: "image",
        imageUrl: "http://localhost:8000/static/charts/chart_2.png",
        metadata: null,
      },
    ];

    render(<AISidebar {...defaultProps} generatedCharts={charts} />);

    // Switch to gallery tab
    await user.click(screen.getByText(/charts/i));

    const regenerateButtons = screen.getAllByTitle(
      "Regenerate with current data",
    );
    expect(regenerateButtons).toHaveLength(1); // Only one chart has metadata
  });

  it("should call regenerateChart API when regenerate button clicked", async () => {
    const { regenerateChart } = await import("../../services/api");
    regenerateChart.mockResolvedValueOnce({
      chart_url: "/static/charts/chart_new.png",
      chart_metadata: {
        chart_type: "bar",
        x_column: "category",
        y_column: "value",
        title: "Regenerated Chart",
      },
    });

    const user = userEvent.setup();
    const charts = [
      {
        id: 1,
        type: "bar",
        imageUrl: "http://localhost:8000/static/charts/chart_1.png",
        metadata: {
          chart_type: "bar",
          x_column: "category",
          y_column: "value",
          title: "Original Chart",
        },
      },
    ];

    render(<AISidebar {...defaultProps} generatedCharts={charts} />);

    // Switch to gallery tab
    await user.click(screen.getByText(/charts/i));

    const regenerateButton = screen.getByTitle("Regenerate with current data");
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(regenerateChart).toHaveBeenCalledWith(
        expect.objectContaining({
          chart_type: "bar",
          x_column: "category",
          y_column: "value",
        }),
        "meli_dark",
      );
    });
  });

  it("should add new chart to gallery after successful regeneration", async () => {
    const { regenerateChart } = await import("../../services/api");
    regenerateChart.mockResolvedValueOnce({
      chart_url: "/static/charts/chart_regenerated.png",
      chart_metadata: {
        chart_type: "bar",
        x_column: "category",
        y_column: "value",
      },
    });

    const user = userEvent.setup();
    const charts = [
      {
        id: 1,
        type: "bar",
        imageUrl: "http://localhost:8000/static/charts/chart_1.png",
        metadata: {
          chart_type: "bar",
          x_column: "category",
          y_column: "value",
        },
      },
    ];

    render(<AISidebar {...defaultProps} generatedCharts={charts} />);

    // Switch to gallery tab
    await user.click(screen.getByText(/charts/i));

    const regenerateButton = screen.getByTitle("Regenerate with current data");
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(defaultProps.onChartGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "bar",
          imageUrl: expect.stringContaining("chart_regenerated.png"),
          metadata: expect.objectContaining({ chart_type: "bar" }),
        }),
      );
    });
  });

  it("should show error alert when regeneration fails", async () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { regenerateChart } = await import("../../services/api");
    regenerateChart.mockRejectedValueOnce(new Error("Column not found"));

    const user = userEvent.setup();
    const charts = [
      {
        id: 1,
        type: "bar",
        imageUrl: "http://localhost:8000/static/charts/chart_1.png",
        metadata: { chart_type: "bar", x_column: "invalid", y_column: "value" },
      },
    ];

    render(<AISidebar {...defaultProps} generatedCharts={charts} />);

    // Switch to gallery tab
    await user.click(screen.getByText(/charts/i));

    const regenerateButton = screen.getByTitle("Regenerate with current data");
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Column not found"),
      );
    });

    alertMock.mockRestore();
  });

  it("should not show regenerate button for charts without metadata", async () => {
    const user = userEvent.setup();
    const charts = [
      {
        id: 1,
        type: "image",
        imageUrl: "http://localhost:8000/static/charts/chart_1.png",
        metadata: null,
      },
    ];

    render(<AISidebar {...defaultProps} generatedCharts={charts} />);

    // Switch to gallery tab
    await user.click(screen.getByText(/charts/i));

    const regenerateButtons = screen.queryAllByTitle(
      "Regenerate with current data",
    );
    expect(regenerateButtons).toHaveLength(0);
  });
});
