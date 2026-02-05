import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AISidebar from "../AISidebar";

// Mock the API module
vi.mock("../../services/api", () => ({
  sendChatMessage: vi.fn(),
  getChartImageUrl: vi.fn((url) => `http://localhost:8000${url}`),
  getOrCreateSessionId: vi.fn(() => "test-session"),
  resetSession: vi.fn(),
}));

describe("AISidebar Chart Metadata Storage", () => {
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

  it("should include metadata in chart object when API returns it", async () => {
    const { sendChatMessage } = await import("../../services/api");
    sendChatMessage.mockResolvedValueOnce({
      response: "Here is your bar chart",
      chart_url: "/static/charts/chart_123.png",
      chart_metadata: {
        chart_type: "bar",
        x_column: "category",
        y_column: "value",
        title: "Test Chart",
        theme: "meli_dark",
        created_at: "2026-02-04T12:00:00",
        chart_url: "/static/charts/chart_123.png",
        row_count: 3,
      },
      session_id: "test-session",
    });

    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe/i);
    await user.type(input, "Create a bar chart");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    await waitFor(() => {
      expect(defaultProps.onChartGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "bar",
          metadata: expect.objectContaining({
            chart_type: "bar",
            x_column: "category",
            y_column: "value",
          }),
        }),
      );
    });
  });

  it("should set metadata to null when API returns no metadata", async () => {
    const { sendChatMessage } = await import("../../services/api");
    sendChatMessage.mockResolvedValueOnce({
      response: "Here is your chart",
      chart_url: "/static/charts/chart_123.png",
      chart_metadata: null,
      session_id: "test-session",
    });

    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe/i);
    await user.type(input, "Create a chart");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    await waitFor(() => {
      expect(defaultProps.onChartGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "image",
          metadata: null,
        }),
      );
    });
  });

  it("should use chart_type from metadata as the chart type", async () => {
    const { sendChatMessage } = await import("../../services/api");
    sendChatMessage.mockResolvedValueOnce({
      response: "Here is your line chart",
      chart_url: "/static/charts/chart_456.png",
      chart_metadata: {
        chart_type: "line",
        x_column: "date",
        y_column: "revenue",
      },
      session_id: "test-session",
    });

    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe/i);
    await user.type(input, "Show revenue over time");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    await waitFor(() => {
      expect(defaultProps.onChartGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "line",
        }),
      );
    });
  });
});
