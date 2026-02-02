import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../Header";

describe("Header", () => {
  const defaultProps = {
    slidesUrl: "",
    onSlidesUrlChange: vi.fn(),
    sidebarOpen: true,
    onToggleSidebar: vi.fn(),
    currentView: "main",
    onViewChange: vi.fn(),
  };

  it("renders logo and title", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("Slides AI")).toBeInTheDocument();
  });

  it("shows URL form in main view", () => {
    render(<Header {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Paste Google Slides URL..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load/i })).toBeInTheDocument();
  });

  it("hides URL form in data view", () => {
    render(<Header {...defaultProps} currentView="data" />);
    expect(
      screen.queryByPlaceholderText("Paste Google Slides URL..."),
    ).not.toBeInTheDocument();
  });

  it("converts edit URL to embed URL on submit", async () => {
    const user = userEvent.setup();
    const onSlidesUrlChange = vi.fn();
    render(<Header {...defaultProps} onSlidesUrlChange={onSlidesUrlChange} />);

    const input = screen.getByPlaceholderText("Paste Google Slides URL...");
    await user.type(
      input,
      "https://docs.google.com/presentation/d/abc123/edit",
    );
    await user.click(screen.getByRole("button", { name: /load/i }));

    expect(onSlidesUrlChange).toHaveBeenCalledWith(
      "https://docs.google.com/presentation/d/abc123/embed?start=false&loop=false&delayms=3000",
    );
  });

  it("adds embed to URL if not present", async () => {
    const user = userEvent.setup();
    const onSlidesUrlChange = vi.fn();
    render(<Header {...defaultProps} onSlidesUrlChange={onSlidesUrlChange} />);

    const input = screen.getByPlaceholderText("Paste Google Slides URL...");
    await user.type(input, "https://docs.google.com/presentation/d/abc123");
    await user.click(screen.getByRole("button", { name: /load/i }));

    expect(onSlidesUrlChange).toHaveBeenCalledWith(
      "https://docs.google.com/presentation/d/abc123/embed?start=false&loop=false&delayms=3000",
    );
  });

  it("clears URL when empty input is submitted", async () => {
    const user = userEvent.setup();
    const onSlidesUrlChange = vi.fn();
    render(<Header {...defaultProps} onSlidesUrlChange={onSlidesUrlChange} />);

    await user.click(screen.getByRole("button", { name: /load/i }));

    expect(onSlidesUrlChange).toHaveBeenCalledWith("");
  });

  it("shows Data button in main view", () => {
    render(<Header {...defaultProps} currentView="main" />);
    expect(screen.getByRole("button", { name: /data/i })).toBeInTheDocument();
  });

  it("shows Back button in data view", () => {
    render(<Header {...defaultProps} currentView="data" />);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("toggles view when data/back button is clicked", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    const { rerender } = render(
      <Header {...defaultProps} onViewChange={onViewChange} />,
    );

    await user.click(screen.getByRole("button", { name: /data/i }));
    expect(onViewChange).toHaveBeenCalledWith("data");

    rerender(
      <Header
        {...defaultProps}
        currentView="data"
        onViewChange={onViewChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(onViewChange).toHaveBeenCalledWith("main");
  });

  it("shows sidebar toggle in main view", () => {
    render(<Header {...defaultProps} currentView="main" />);
    const toggleButton = screen.getByTitle(/close sidebar|open sidebar/i);
    expect(toggleButton).toBeInTheDocument();
  });

  it("hides sidebar toggle in data view", () => {
    render(<Header {...defaultProps} currentView="data" />);
    const toggleButton = screen.queryByTitle(/close sidebar|open sidebar/i);
    expect(toggleButton).not.toBeInTheDocument();
  });

  it("calls onToggleSidebar when sidebar toggle is clicked", async () => {
    const user = userEvent.setup();
    const onToggleSidebar = vi.fn();
    render(<Header {...defaultProps} onToggleSidebar={onToggleSidebar} />);

    const toggleButton = screen.getByTitle(/close sidebar/i);
    await user.click(toggleButton);

    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it("shows correct icon based on sidebar state", () => {
    const { rerender } = render(
      <Header {...defaultProps} sidebarOpen={true} />,
    );
    expect(screen.getByTitle(/close sidebar/i)).toBeInTheDocument();

    rerender(<Header {...defaultProps} sidebarOpen={false} />);
    expect(screen.getByTitle(/open sidebar/i)).toBeInTheDocument();
  });

  it("updates input value as user types", async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);

    const input = screen.getByPlaceholderText("Paste Google Slides URL...");
    await user.type(input, "test url");

    expect(input).toHaveValue("test url");
  });

  it("applies active class to Data button when in data view", () => {
    render(<Header {...defaultProps} currentView="data" />);
    const dataButton = screen.getByRole("button", { name: /back/i });
    expect(dataButton).toHaveClass("active");
  });
});
