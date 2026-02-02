import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SlidesViewer from "../SlidesViewer";

describe("SlidesViewer", () => {
  it("shows placeholder when no URL is provided", () => {
    render(<SlidesViewer url="" sidebarOpen={true} />);

    expect(screen.getByText("Load a Google Presentation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Paste a Google Slides URL in the header to get started",
      ),
    ).toBeInTheDocument();
  });

  it("shows placeholder steps when no URL is provided", () => {
    render(<SlidesViewer url="" sidebarOpen={true} />);

    expect(
      screen.getByText("Open your presentation in Google Slides"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Copy the URL from your browser"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Paste it above and click "Load"'),
    ).toBeInTheDocument();
  });

  it("shows iframe when URL is provided", () => {
    const testUrl = "https://docs.google.com/presentation/d/abc123/embed";
    render(<SlidesViewer url={testUrl} sidebarOpen={true} />);

    const iframe = screen.getByTitle("Google Slides Presentation");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", testUrl);
  });

  it("iframe has correct attributes", () => {
    const testUrl = "https://docs.google.com/presentation/d/abc123/embed";
    render(<SlidesViewer url={testUrl} sidebarOpen={true} />);

    const iframe = screen.getByTitle("Google Slides Presentation");
    expect(iframe).toHaveAttribute("frameBorder", "0");
    expect(iframe).toHaveAttribute("allowFullScreen");
  });

  it("applies full-width class when sidebar is closed", () => {
    const { container } = render(<SlidesViewer url="" sidebarOpen={false} />);
    const viewer = container.querySelector(".slides-viewer");
    expect(viewer).toHaveClass("full-width");
  });

  it("does not apply full-width class when sidebar is open", () => {
    const { container } = render(<SlidesViewer url="" sidebarOpen={true} />);
    const viewer = container.querySelector(".slides-viewer");
    expect(viewer).not.toHaveClass("full-width");
  });

  it("shows demo hint in placeholder", () => {
    render(<SlidesViewer url="" sidebarOpen={true} />);
    expect(screen.getByText(/or try the ai assistant/i)).toBeInTheDocument();
  });
});
