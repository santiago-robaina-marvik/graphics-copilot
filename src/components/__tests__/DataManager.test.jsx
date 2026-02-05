import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataManager from "../DataManager";
import { renderWithCleanState, createMockFile } from "../../test/utils";

// Mock PapaParse
vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn((input, options) => {
      // Handle file input
      if (input instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const mockData = [
            { Name: "Product A", Value: 100 },
            { Name: "Product B", Value: 200 },
          ];
          options.complete({ data: mockData, errors: [] });
        };
        reader.readAsText(input);
      }
      // Handle string input (manual CSV)
      else if (typeof input === "string") {
        const mockData = [
          { Month: "Jan", Revenue: 45000 },
          { Month: "Feb", Revenue: 52000 },
        ];
        options.complete({ data: mockData, errors: [] });
      }
    }),
  },
}));

// Mock fetch for Google Sheets
global.fetch = vi.fn();

// Mock window.confirm and window.alert
global.confirm = vi.fn(() => true);
global.alert = vi.fn();

describe("DataManager", () => {
  const defaultProps = {
    userData: null,
    onDataUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch.mockReset();
  });

  it("renders data management header", () => {
    render(<DataManager {...defaultProps} />);
    expect(screen.getByText("Data Management")).toBeInTheDocument();
    expect(
      screen.getByText(/upload, view, and manage your datasets/i),
    ).toBeInTheDocument();
  });

  it("shows empty state when no datasets exist", () => {
    render(<DataManager {...defaultProps} />);
    expect(screen.getByText("No datasets yet")).toBeInTheDocument();
    expect(
      screen.getByText(/upload a csv file or add data manually/i),
    ).toBeInTheDocument();
  });

  it("renders upload, manual add, and connect buttons", () => {
    render(<DataManager {...defaultProps} />);
    expect(screen.getByText("Upload CSV File")).toBeInTheDocument();
    expect(screen.getByText("Add Manual Data")).toBeInTheDocument();
    expect(screen.getByText("Connect Google Sheet")).toBeInTheDocument();
  });

  it("loads datasets from localStorage on mount", () => {
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: [{ col1: "val1" }],
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    expect(screen.getByText("Test Dataset")).toBeInTheDocument();
  });

  it("shows manual data form when Add Manual Data is clicked", async () => {
    const user = userEvent.setup();
    render(<DataManager {...defaultProps} />);

    await user.click(screen.getByText("Add Manual Data"));

    expect(screen.getByPlaceholderText("Dataset name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/paste csv data here/i),
    ).toBeInTheDocument();
  });

  it("shows Google Sheets form when Connect Google Sheet is clicked", async () => {
    const user = userEvent.setup();
    render(<DataManager {...defaultProps} />);

    await user.click(screen.getByText("Connect Google Sheet"));

    expect(screen.getByText(/how to connect/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/https:\/\/docs\.google\.com/i),
    ).toBeInTheDocument();
  });

  it("hides forms when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<DataManager {...defaultProps} />);

    await user.click(screen.getByText("Add Manual Data"));
    expect(screen.getByPlaceholderText("Dataset name")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(
      screen.queryByPlaceholderText("Dataset name"),
    ).not.toBeInTheDocument();
  });

  it("processes uploaded CSV file", async () => {
    const user = userEvent.setup();
    render(<DataManager {...defaultProps} />);

    const uploadLabel = screen.getByText("Upload CSV File").closest("label");
    const fileInput = uploadLabel?.querySelector('input[type="file"]');

    const file = createMockFile("test.csv", "Name,Value\nProduct A,100");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test")).toBeInTheDocument(); // filename without .csv
    });
  });

  it("shows persistence note", () => {
    render(<DataManager {...defaultProps} />);
    expect(
      screen.getByText(/your data is automatically saved/i),
    ).toBeInTheDocument();
  });

  it("shows Clear All Data button when datasets exist", () => {
    const mockDatasets = [{ id: 1, name: "Test", data: [{ a: 1 }] }];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);
    expect(screen.getByText("Clear All Data")).toBeInTheDocument();
  });

  it("hides Clear All Data button when no datasets exist", () => {
    render(<DataManager {...defaultProps} />);
    expect(screen.queryByText("Clear All Data")).not.toBeInTheDocument();
  });

  it("shows dataset metadata (rows and columns)", () => {
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: [
          { col1: "a", col2: "b" },
          { col1: "c", col2: "d" },
        ],
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    expect(screen.getByText(/2 rows/i)).toBeInTheDocument();
    expect(screen.getByText(/2 columns/i)).toBeInTheDocument();
  });

  it("toggles preview when eye icon is clicked", async () => {
    const user = userEvent.setup();
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: [{ Name: "Product A", Value: 100 }],
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    // Initially no preview
    expect(screen.queryByText("Product A")).not.toBeInTheDocument();

    // Click to show preview
    const previewButton = screen.getByTitle("Show preview");
    await user.click(previewButton);

    expect(screen.getByText("Product A")).toBeInTheDocument();

    // Click to hide preview
    const hideButton = screen.getByTitle("Hide preview");
    await user.click(hideButton);

    expect(screen.queryByText("Product A")).not.toBeInTheDocument();
  });

  it("calls onDataUpdate when Use button is clicked", async () => {
    const user = userEvent.setup();
    const onDataUpdate = vi.fn();
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: [{ Name: "Product A", Value: 100 }],
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} onDataUpdate={onDataUpdate} />);

    const useButton = screen.getByTitle("Use this dataset");
    await user.click(useButton);

    expect(onDataUpdate).toHaveBeenCalledWith(mockDatasets[0].data, null);
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining("Test Dataset"),
    );
  });

  it("deletes dataset when delete button is clicked", async () => {
    const user = userEvent.setup();
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: [{ Name: "Product A", Value: 100 }],
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    expect(screen.getByText("Test Dataset")).toBeInTheDocument();

    const deleteButton = screen.getByTitle("Delete dataset");
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("Test Dataset")).not.toBeInTheDocument();
    });
  });

  it("shows Google Sheets badge for Google Sheets datasets", () => {
    const mockDatasets = [
      {
        id: 1,
        name: "Sheet Dataset",
        data: [{ Name: "A", Value: 1 }],
        source: "google-sheets",
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    expect(screen.getByText("Google Sheets")).toBeInTheDocument();
  });

  it("shows refresh button for Google Sheets datasets", () => {
    const mockDatasets = [
      {
        id: 1,
        name: "Sheet Dataset",
        data: [{ Name: "A", Value: 1 }],
        source: "google-sheets",
        sourceUrl: "https://docs.google.com/spreadsheets/d/abc123/edit",
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    expect(
      screen.getByTitle("Refresh data from Google Sheets"),
    ).toBeInTheDocument();
  });

  it("shows upload date when available", () => {
    const uploadDate = new Date("2024-01-15").toISOString();
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: [{ Name: "A", Value: 1 }],
        uploadedAt: uploadDate,
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    // Check that a date is shown (locale-agnostic)
    const expectedDate = new Date(uploadDate).toLocaleDateString();
    expect(
      screen.getByText(new RegExp(expectedDate.replace(/\//g, "\\/"))),
    ).toBeInTheDocument();
  });

  it("limits preview to first 5 rows", () => {
    const mockDatasets = [
      {
        id: 1,
        name: "Test Dataset",
        data: Array.from({ length: 10 }, (_, i) => ({
          Name: `Product ${i}`,
          Value: i * 100,
        })),
      },
    ];
    localStorage.setItem("datasets", JSON.stringify(mockDatasets));

    render(<DataManager {...defaultProps} />);

    const previewButton = screen.getByTitle("Show preview");
    previewButton.click();

    // Wait for preview to render
    waitFor(() => {
      expect(
        screen.getByText(/showing first 5 of 10 rows/i),
      ).toBeInTheDocument();
    });
  });
});
