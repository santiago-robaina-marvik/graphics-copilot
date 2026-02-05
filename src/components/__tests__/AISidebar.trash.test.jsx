import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "../../test/mocks/handlers";
import AISidebar from "../AISidebar";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

const defaultProps = {
  isOpen: true,
  onChartGenerated: vi.fn(),
  onChartDeleted: vi.fn(),
  generatedCharts: [],
  chartTheme: "meli_dark",
  onThemeChange: vi.fn(),
  trashedCharts: [],
  onTrashLoad: vi.fn(),
  onChartRestored: vi.fn(),
};

describe("AISidebar Trash Tab", () => {
  it("renders the Trash tab button", () => {
    render(<AISidebar {...defaultProps} />);

    expect(screen.getByTitle(/trash/i)).toBeInTheDocument();
  });

  it("renders trash tab as icon only", () => {
    const trashedCharts = [
      {
        filename: "chart_1.png",
        deleted_at: "2026-01-01T12:00:00",
        expires_at: "2026-01-08T12:00:00",
      },
    ];

    render(<AISidebar {...defaultProps} trashedCharts={trashedCharts} />);

    // Title shows "Trash" (no count)
    expect(screen.getByTitle("Trash")).toBeInTheDocument();
  });

  it("calls onTrashLoad when trash tab is clicked", () => {
    const onTrashLoad = vi.fn();
    render(<AISidebar {...defaultProps} onTrashLoad={onTrashLoad} />);

    fireEvent.click(screen.getByTitle(/trash/i));

    expect(onTrashLoad).toHaveBeenCalled();
  });

  it("shows empty state when trash is empty", () => {
    render(<AISidebar {...defaultProps} />);

    fireEvent.click(screen.getByTitle(/trash/i));

    expect(screen.getByText("Trash is empty")).toBeInTheDocument();
    expect(
      screen.getByText("Deleted charts will appear here for 7 days"),
    ).toBeInTheDocument();
  });

  it("shows trashed charts with expiration days", () => {
    // Set up a chart that expires in 5 days
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const trashedCharts = [
      {
        filename: "chart_test.png",
        deleted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        metadata: { title: "Test Chart" },
      },
    ];

    render(<AISidebar {...defaultProps} trashedCharts={trashedCharts} />);

    fireEvent.click(screen.getByTitle(/trash/i));

    // Should show expiration info
    expect(screen.getByText(/expires in 5 days/i)).toBeInTheDocument();
  });

  it("shows singular 'day' when 1 day left", () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const trashedCharts = [
      {
        filename: "chart_test.png",
        deleted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    ];

    render(<AISidebar {...defaultProps} trashedCharts={trashedCharts} />);

    fireEvent.click(screen.getByTitle(/trash/i));

    expect(screen.getByText("Expires in 1 day")).toBeInTheDocument();
  });

  it("calls onChartRestored when restore button is clicked", () => {
    const onChartRestored = vi.fn();
    const trashedCharts = [
      {
        filename: "chart_restore_test.png",
        deleted_at: "2026-01-01T12:00:00",
        expires_at: "2026-01-08T12:00:00",
      },
    ];

    render(
      <AISidebar
        {...defaultProps}
        trashedCharts={trashedCharts}
        onChartRestored={onChartRestored}
      />,
    );

    fireEvent.click(screen.getByTitle(/trash/i));

    // Find and click restore button
    const restoreButton = screen.getByTitle("Restore chart");
    fireEvent.click(restoreButton);

    expect(onChartRestored).toHaveBeenCalledWith("chart_restore_test.png");
  });

  it("displays chart images from trash directory", () => {
    const trashedCharts = [
      {
        filename: "chart_image_test.png",
        deleted_at: "2026-01-01T12:00:00",
        expires_at: "2026-01-08T12:00:00",
      },
    ];

    render(<AISidebar {...defaultProps} trashedCharts={trashedCharts} />);

    fireEvent.click(screen.getByTitle(/trash/i));

    const img = screen.getByAltText("Deleted chart");
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/static/charts/trash/chart_image_test.png");
  });
});
