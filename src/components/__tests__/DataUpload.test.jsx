import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataUpload from "../DataUpload";
import { createMockFile } from "../../test/utils";

// Mock PapaParse
vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn((file, options) => {
      // Simulate successful CSV parsing
      const reader = new FileReader();
      reader.onload = () => {
        const mockData = [
          { Name: "Product A", Value: 100, Category: "Electronics" },
          { Name: "Product B", Value: 200, Category: "Furniture" },
          { Name: "Product C", Value: 150, Category: "Electronics" },
        ];
        options.complete({
          data: mockData,
          errors: [],
        });
      };
      reader.readAsText(file);
    }),
  },
}));

describe("DataUpload", () => {
  const defaultProps = {
    onDataLoaded: vi.fn(),
    currentData: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload zone initially", () => {
    render(<DataUpload {...defaultProps} />);
    expect(screen.getByText("Upload Your Data")).toBeInTheDocument();
    expect(
      screen.getByText("Drag and drop a CSV file or click to browse"),
    ).toBeInTheDocument();
  });

  it("opens file picker when upload zone is clicked", async () => {
    const user = userEvent.setup();
    render(<DataUpload {...defaultProps} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    expect(fileInput).toHaveAttribute("style", "display: none;");

    // Note: Can't fully test file picker opening due to browser security
    await user.click(uploadZone);
  });

  it("accepts only CSV files", () => {
    render(<DataUpload {...defaultProps} />);
    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    expect(fileInput).toHaveAttribute("accept", ".csv");
  });

  it("processes and previews uploaded file", async () => {
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(<DataUpload {...defaultProps} onDataLoaded={onDataLoaded} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile(
      "test.csv",
      "Name,Value,Category\nProduct A,100,Electronics",
    );

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });

    expect(onDataLoaded).toHaveBeenCalled();
  });

  it("shows error for non-CSV files", async () => {
    render(<DataUpload {...defaultProps} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile("test.txt", "some content", "text/plain");

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Please upload a CSV file")).toBeInTheDocument();
    });
  });

  it("shows preview with column information", async () => {
    render(<DataUpload {...defaultProps} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile(
      "test.csv",
      "Name,Value,Category\nProduct A,100,Electronics",
    );

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Columns:")).toBeInTheDocument();
      expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Value").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Category").length).toBeGreaterThan(0);
    });
  });

  it("shows preview with row count", async () => {
    const user = userEvent.setup();
    render(<DataUpload {...defaultProps} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile("test.csv", "Name,Value\nA,1\nB,2\nC,3");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/3 rows/)).toBeInTheDocument();
    });
  });

  it("shows success message after data is loaded", async () => {
    const user = userEvent.setup();
    render(<DataUpload {...defaultProps} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile("test.csv", "Name,Value\nA,1");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/data loaded successfully/i)).toBeInTheDocument();
    });
  });

  it("clears preview when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onDataLoaded = vi.fn();
    render(<DataUpload {...defaultProps} onDataLoaded={onDataLoaded} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile("test.csv", "Name,Value\nA,1");

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });

    const clearButton = screen.getByTitle("Remove data");
    await user.click(clearButton);

    expect(screen.getByText("Upload Your Data")).toBeInTheDocument();
    expect(onDataLoaded).toHaveBeenCalledWith(null);
  });

  it("applies dragging class when file is dragged over", async () => {
    const { container } = render(<DataUpload {...defaultProps} />);

    const uploadZone = container.querySelector(".upload-zone");

    fireEvent.dragOver(uploadZone);

    expect(uploadZone).toHaveClass("dragging");
  });

  it("removes dragging class when drag leaves", async () => {
    const { container } = render(<DataUpload {...defaultProps} />);

    const uploadZone = container.querySelector(".upload-zone");

    // Drag over first
    fireEvent.dragOver(uploadZone);
    expect(uploadZone).toHaveClass("dragging");

    // Then drag leave
    fireEvent.dragLeave(uploadZone);
    expect(uploadZone).not.toHaveClass("dragging");
  });

  it("renders preview table with sample data", async () => {
    const user = userEvent.setup();
    render(<DataUpload {...defaultProps} />);

    const uploadZone = screen
      .getByText("Upload Your Data")
      .closest(".upload-zone");
    const fileInput = uploadZone?.querySelector('input[type="file"]');

    const file = createMockFile(
      "test.csv",
      "Name,Value\nProduct A,100\nProduct B,200",
    );

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("Product A")).toBeInTheDocument();
    });
  });
});
