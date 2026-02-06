import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AISidebar from "../AISidebar";

// Mock services
vi.mock("../../services/api", () => ({
  sendChatMessage: vi.fn(() =>
    Promise.resolve({
      response: "Here is your chart",
      chartData: {
        type: "bar",
        data: [{ name: "A", value: 100 }],
      },
    }),
  ),
  getChartImageUrl: vi.fn(() =>
    Promise.resolve("data:image/png;base64,mockImage"),
  ),
  getOrCreateSessionId: vi.fn(() => "test-session-id"),
  resetSession: vi.fn(() => Promise.resolve()),
}));

describe("AISidebar", () => {
  const defaultProps = {
    isOpen: true,
    onChartGenerated: vi.fn(),
    onChartDeleted: vi.fn(),
    generatedCharts: [],
    userData: null,
    chartTheme: "meli_dark",
    onThemeChange: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<AISidebar {...defaultProps} />);
    expect(screen.getByText(/upload your data/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <AISidebar {...defaultProps} isOpen={false} />,
    );
    const sidebar = container.querySelector(".ai-sidebar");
    expect(sidebar).toBeNull();
  });

  it("shows initial welcome message", () => {
    render(<AISidebar {...defaultProps} />);
    expect(
      screen.getByText(
        /upload your data.*or describe what you'd like to visualize/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders chat and gallery tabs", () => {
    render(<AISidebar {...defaultProps} />);
    expect(screen.getByText(/chat/i)).toBeInTheDocument();
    expect(screen.getByText(/charts/i)).toBeInTheDocument();
  });

  it("shows suggested prompts", () => {
    render(<AISidebar {...defaultProps} />);
    expect(
      screen.getByText(/create a bar chart comparing/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/show monthly revenue trend/i)).toBeInTheDocument();
  });

  it("has input field and send button", () => {
    render(<AISidebar {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/describe the chart/i),
    ).toBeInTheDocument();
    const sendButton = screen.getByRole("button", { name: "" });
    expect(sendButton).toHaveClass("send-btn");
  });

  it("updates input value as user types", async () => {
    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe the chart/i);
    await user.type(input, "Create a bar chart");

    expect(input).toHaveValue("Create a bar chart");
  });

  it("sends message when send button is clicked", async () => {
    const user = userEvent.setup();
    const { sendChatMessage } = await import("../../services/api");
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe the chart/i);
    await user.type(input, "Create a bar chart");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    expect(sendChatMessage).toHaveBeenCalledWith(
      "Create a bar chart",
      "test-session-id",
      null,
      "meli_dark",
      undefined, // activeSheetSource
    );
  });

  it("clears input after sending message", async () => {
    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe the chart/i);
    await user.type(input, "Create a bar chart");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("displays user message in chat", async () => {
    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe the chart/i);
    await user.type(input, "Create a bar chart");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("Create a bar chart")).toBeInTheDocument();
    });
  });

  it("sends message when suggested prompt is clicked", async () => {
    const user = userEvent.setup();
    const { sendChatMessage } = await import("../../services/api");
    render(<AISidebar {...defaultProps} />);

    const suggestedPrompt = screen.getByText(/create a bar chart comparing/i);
    await user.click(suggestedPrompt);

    expect(sendChatMessage).toHaveBeenCalled();
  });

  it("disables send button when generating", async () => {
    const user = userEvent.setup();
    const { sendChatMessage } = await import("../../services/api");

    // Make the API call take a while
    sendChatMessage.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ response: "test" }), 100),
        ),
    );

    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe the chart/i);
    await user.type(input, "Create a bar chart");

    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    expect(sendButton).toBeDisabled();
  });

  it("switches between chat and gallery tabs", async () => {
    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    // Initially on chat tab
    expect(
      screen.getByPlaceholderText(/describe the chart/i),
    ).toBeInTheDocument();

    // Click gallery tab
    await user.click(screen.getByText(/charts/i));

    // Chat input should not be visible
    expect(
      screen.queryByPlaceholderText(/describe the chart/i),
    ).not.toBeInTheDocument();
  });

  it("shows empty state in gallery when no charts", async () => {
    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} generatedCharts={[]} />);

    await user.click(screen.getByText(/charts/i));

    expect(screen.getByText(/no charts yet/i)).toBeInTheDocument();
  });

  it("displays generated charts in gallery", async () => {
    const user = userEvent.setup();
    const mockCharts = [
      { id: 1, type: "bar", imageUrl: "data:image/png;base64,test" },
    ];

    render(<AISidebar {...defaultProps} generatedCharts={mockCharts} />);

    await user.click(screen.getByText(/charts/i));

    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("persists chat messages to localStorage", async () => {
    const user = userEvent.setup();
    render(<AISidebar {...defaultProps} />);

    const input = screen.getByPlaceholderText(/describe the chart/i);
    await user.type(input, "Test message");
    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    await waitFor(() => {
      const saved = localStorage.getItem("chatMessages");
      expect(saved).toBeTruthy();
      const messages = JSON.parse(saved);
      expect(messages.some((m) => m.content === "Test message")).toBe(true);
    });
  });

  it("loads persisted chat messages from localStorage", () => {
    const mockMessages = [
      { type: "user", content: "Previous message" },
      { type: "assistant", content: "Previous response" },
    ];
    localStorage.setItem("chatMessages", JSON.stringify(mockMessages));

    render(<AISidebar {...defaultProps} />);

    expect(screen.getByText("Previous message")).toBeInTheDocument();
    expect(screen.getByText("Previous response")).toBeInTheDocument();
  });

  it("processes external userData when provided", () => {
    const mockUserData = [
      { Name: "Product A", Value: 100 },
      { Name: "Product B", Value: 200 },
    ];

    render(<AISidebar {...defaultProps} userData={mockUserData} />);

    // Component should process the data internally
    // This is mainly testing that it doesn't crash with valid data
    expect(
      screen.getByPlaceholderText(/describe the chart/i),
    ).toBeInTheDocument();
  });

  it("prevents sending empty messages", async () => {
    const user = userEvent.setup();
    const { sendChatMessage } = await import("../../services/api");
    render(<AISidebar {...defaultProps} />);

    const sendButton = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("send-btn"));
    await user.click(sendButton);

    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it("shows 'Chart deleted' placeholder for deleted charts in chat", () => {
    const deletedChartUrl =
      "http://localhost:8000/static/charts/deleted_chart.png";
    const mockMessages = [
      {
        type: "assistant",
        content: "Here is your chart",
        chartImage: deletedChartUrl,
        chartId: 123,
      },
    ];
    localStorage.setItem("chatMessages", JSON.stringify(mockMessages));

    // generatedCharts is empty, so the chart URL won't be found
    render(<AISidebar {...defaultProps} generatedCharts={[]} />);

    expect(screen.getByText("Chart deleted")).toBeInTheDocument();
    // Should NOT show the copy/download buttons
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
    expect(screen.queryByText("Download")).not.toBeInTheDocument();
  });

  it("shows chart image when chart exists in generatedCharts", () => {
    const chartUrl = "http://localhost:8000/static/charts/existing_chart.png";
    const mockMessages = [
      {
        type: "assistant",
        content: "Here is your chart",
        chartImage: chartUrl,
        chartId: 123,
      },
    ];
    localStorage.setItem("chatMessages", JSON.stringify(mockMessages));

    const mockCharts = [{ id: 123, type: "bar", imageUrl: chartUrl }];
    render(<AISidebar {...defaultProps} generatedCharts={mockCharts} />);

    // Should show the chart image
    const images = screen.getAllByRole("img");
    expect(images.some((img) => img.src === chartUrl)).toBe(true);
    // Should show copy/download buttons
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    // Should NOT show deleted placeholder
    expect(screen.queryByText("Chart deleted")).not.toBeInTheDocument();
  });
});
