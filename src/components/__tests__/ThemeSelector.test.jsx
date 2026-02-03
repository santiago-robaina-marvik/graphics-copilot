import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeSelector from "../ThemeSelector";

describe("ThemeSelector", () => {
  const defaultProps = {
    selectedTheme: "meli_dark",
    onThemeChange: vi.fn(),
  };

  it("renders all three theme options", () => {
    render(<ThemeSelector {...defaultProps} />);

    expect(screen.getByText("Meli Dark")).toBeInTheDocument();
    expect(screen.getByText("Meli Light")).toBeInTheDocument();
    expect(screen.getByText("Meli Yellow")).toBeInTheDocument();
  });

  it("shows active state for selected theme", () => {
    render(<ThemeSelector {...defaultProps} selectedTheme="meli_light" />);

    const lightButton = screen.getByTitle("Meli Light");
    expect(lightButton).toHaveClass("active");

    const darkButton = screen.getByTitle("Meli Dark");
    expect(darkButton).not.toHaveClass("active");
  });

  it("calls onThemeChange when theme is clicked", async () => {
    const onThemeChange = vi.fn();
    const user = userEvent.setup();
    render(<ThemeSelector {...defaultProps} onThemeChange={onThemeChange} />);

    await user.click(screen.getByTitle("Meli Light"));

    expect(onThemeChange).toHaveBeenCalledWith("meli_light");
  });

  it("displays chart theme header", () => {
    render(<ThemeSelector {...defaultProps} />);

    expect(screen.getByText("Chart Theme")).toBeInTheDocument();
  });

  it("renders mini bar previews for each theme", () => {
    const { container } = render(<ThemeSelector {...defaultProps} />);

    const miniBars = container.querySelectorAll(".mini-bars");
    expect(miniBars).toHaveLength(3);
  });
});
