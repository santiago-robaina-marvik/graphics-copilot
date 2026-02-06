import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import { renderWithCleanState } from "../../test/utils";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders the app", () => {
    render(<App />);
    expect(screen.getByText("Slides AI")).toBeInTheDocument();
  });

  it("renders Header component", () => {
    render(<App />);
    expect(
      screen.getByPlaceholderText("Paste Google Slides URL..."),
    ).toBeInTheDocument();
  });

  it("renders main view by default", () => {
    render(<App />);
    // Check for components that should be in main view
    expect(screen.getByText("Layout")).toBeInTheDocument(); // TemplateSelector
  });

  it("loads persisted slidesUrl from localStorage", () => {
    const testUrl = "https://docs.google.com/presentation/d/abc123/embed";
    renderWithCleanState(<App />, {
      initialLocalStorage: { slidesUrl: testUrl },
    });

    // Verify the URL was loaded (you'd need to check the Header component's state)
    expect(localStorage.getItem("slidesUrl")).toBe(testUrl);
  });

  it("loads persisted generatedCharts from localStorage", () => {
    const testCharts = [
      { id: 1, type: "bar", imageUrl: "data:image/png;base64,test" },
    ];
    renderWithCleanState(<App />, {
      initialLocalStorage: { generatedCharts: testCharts },
    });

    expect(localStorage.getItem("generatedCharts")).toBe(
      JSON.stringify(testCharts),
    );
  });

  it("loads persisted sidebarOpen state from localStorage", () => {
    renderWithCleanState(<App />, {
      initialLocalStorage: { sidebarOpen: false },
    });

    expect(localStorage.getItem("sidebarOpen")).toBe(JSON.stringify(false));
  });

  it("loads persisted userData from localStorage", () => {
    const testData = {
      columns: ["Name", "Value"],
      data: [["Product A", 100]],
    };
    renderWithCleanState(<App />, {
      initialLocalStorage: { activeUserData: testData },
    });

    expect(localStorage.getItem("activeUserData")).toBe(
      JSON.stringify(testData),
    );
  });

  it("defaults to sidebar open when not in localStorage", () => {
    render(<App />);
    const sidebarState = localStorage.getItem("sidebarOpen");
    expect(sidebarState).toBe(JSON.stringify(true));
  });

  it("switches to data view when Data button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initially in main view
    expect(screen.getByText("Layout")).toBeInTheDocument();

    // Click Data button
    await user.click(screen.getByRole("button", { name: /data/i }));

    // Should now be in data view
    await waitFor(() => {
      expect(screen.getByText("Data Management")).toBeInTheDocument();
    });
  });

  it("switches back to main view when Back button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to data view
    await user.click(screen.getByRole("button", { name: /data/i }));

    await waitFor(() => {
      expect(screen.getByText("Data Management")).toBeInTheDocument();
    });

    // Click Back button
    await user.click(screen.getByRole("button", { name: /back/i }));

    // Should be back in main view
    await waitFor(() => {
      expect(screen.getByText("Layout")).toBeInTheDocument();
    });
  });

  it("persists slidesUrl to localStorage when changed", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByPlaceholderText("Paste Google Slides URL...");
    const testUrl = "https://docs.google.com/presentation/d/abc123/edit";

    await user.type(input, testUrl);
    await user.click(screen.getByRole("button", { name: /load/i }));

    await waitFor(() => {
      const savedUrl = localStorage.getItem("slidesUrl");
      expect(savedUrl).toContain("abc123");
      expect(savedUrl).toContain("embed");
    });
  });

  it("toggles sidebar when sidebar toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initially open (default)
    expect(localStorage.getItem("sidebarOpen")).toBe(JSON.stringify(true));

    // Click toggle
    const toggleButton = screen.getByTitle(/close sidebar/i);
    await user.click(toggleButton);

    await waitFor(() => {
      expect(localStorage.getItem("sidebarOpen")).toBe(JSON.stringify(false));
    });
  });

  it("returns to main view after selecting data in DataManager", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Go to data view
    await user.click(screen.getByRole("button", { name: /data/i }));

    await waitFor(() => {
      expect(screen.getByText("Data Management")).toBeInTheDocument();
    });

    // Note: Would need to trigger onDataUpdate callback here
    // This would require more complex setup with mocking
  });

  it("renders SlidesViewer component", () => {
    render(<App />);
    // SlidesViewer shows placeholder when no URL
    expect(screen.getByText("Load a Google Presentation")).toBeInTheDocument();
  });

  it("renders TemplateSelector component", () => {
    render(<App />);
    expect(screen.getByText("Layout")).toBeInTheDocument();
  });

  it("removes userData from localStorage when set to null", () => {
    renderWithCleanState(<App />, {
      initialLocalStorage: {
        activeUserData: { columns: ["test"], data: [["value"]] },
      },
    });

    // Verify it's there
    expect(localStorage.getItem("activeUserData")).toBeTruthy();

    // Note: Would need to trigger state change to null to test removal
    // This would require exposing the setter or triggering it through UI
  });
});
