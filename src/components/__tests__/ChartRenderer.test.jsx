import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ChartRenderer from "../ChartRenderer";

describe("ChartRenderer", () => {
  const mockBarChartData = {
    type: "bar",
    data: [
      { name: "Jan", value: 100 },
      { name: "Feb", value: 200 },
      { name: "Mar", value: 150 },
    ],
    colors: ["#3d5afe"],
  };

  const mockLineChartData = {
    type: "line",
    data: [
      { name: "Jan", value: 100 },
      { name: "Feb", value: 200 },
    ],
    colors: ["#3d5afe"],
  };

  const mockPieChartData = {
    type: "pie",
    data: [
      { name: "Category A", value: 100, fill: "#3d5afe" },
      { name: "Category B", value: 200, fill: "#7c4dff" },
    ],
  };

  const mockAreaChartData = {
    type: "area",
    data: [
      { name: "Jan", value: 100 },
      { name: "Feb", value: 200 },
    ],
    colors: ["#3d5afe"],
  };

  it("renders bar chart by default", () => {
    const { container } = render(<ChartRenderer chart={mockBarChartData} />);
    expect(container.querySelector(".recharts-bar")).toBeInTheDocument();
  });

  it("renders line chart when type is line", () => {
    const { container } = render(<ChartRenderer chart={mockLineChartData} />);
    expect(container.querySelector(".recharts-line")).toBeInTheDocument();
  });

  it("renders pie chart when type is pie", () => {
    const { container } = render(<ChartRenderer chart={mockPieChartData} />);
    expect(container.querySelector(".recharts-pie")).toBeInTheDocument();
  });

  it("renders area chart when type is area", () => {
    const { container } = render(<ChartRenderer chart={mockAreaChartData} />);
    expect(container.querySelector(".recharts-area")).toBeInTheDocument();
  });

  it("uses compact height when compact prop is true", () => {
    const { container } = render(
      <ChartRenderer chart={mockBarChartData} compact={true} />,
    );
    const responsiveContainer = container.querySelector(
      ".recharts-responsive-container",
    );
    expect(responsiveContainer).toHaveStyle({ height: "150px" });
  });

  it("uses default height when compact prop is false", () => {
    const { container } = render(
      <ChartRenderer chart={mockBarChartData} compact={false} />,
    );
    const responsiveContainer = container.querySelector(
      ".recharts-responsive-container",
    );
    expect(responsiveContainer).toHaveStyle({ height: "200px" });
  });

  it("renders legend in non-compact mode", () => {
    const { container } = render(
      <ChartRenderer chart={mockBarChartData} compact={false} />,
    );
    expect(
      container.querySelector(".recharts-legend-wrapper"),
    ).toBeInTheDocument();
  });

  it("hides legend in compact mode", () => {
    const { container } = render(
      <ChartRenderer chart={mockBarChartData} compact={true} />,
    );
    expect(
      container.querySelector(".recharts-legend-wrapper"),
    ).not.toBeInTheDocument();
  });

  it("renders multiple series when value2 is present", () => {
    const multiSeriesData = {
      type: "bar",
      data: [
        { name: "Jan", value: 100, value2: 150 },
        { name: "Feb", value: 200, value2: 250 },
      ],
      colors: ["#3d5afe", "#7c4dff"],
    };
    const { container } = render(<ChartRenderer chart={multiSeriesData} />);
    const bars = container.querySelectorAll(".recharts-bar");
    expect(bars.length).toBeGreaterThan(1);
  });

  it("applies custom colors from chart data", () => {
    const customColorChart = {
      type: "bar",
      data: [{ name: "Jan", value: 100 }],
      colors: ["#ff0000"],
    };
    const { container } = render(<ChartRenderer chart={customColorChart} />);
    const bar = container.querySelector(".recharts-bar");
    expect(bar).toBeInTheDocument();
  });

  it("uses default color when colors are not provided", () => {
    const noColorChart = {
      type: "bar",
      data: [{ name: "Jan", value: 100 }],
    };
    const { container } = render(<ChartRenderer chart={noColorChart} />);
    const bar = container.querySelector(".recharts-bar");
    expect(bar).toBeInTheDocument();
  });

  it("renders pie chart with cells for each data point", () => {
    const { container } = render(<ChartRenderer chart={mockPieChartData} />);
    const pie = container.querySelector(".recharts-pie");
    expect(pie).toBeInTheDocument();
  });

  it("shows labels on pie chart in non-compact mode", () => {
    const { container } = render(
      <ChartRenderer chart={mockPieChartData} compact={false} />,
    );
    const pie = container.querySelector(".recharts-pie");
    expect(pie).toBeInTheDocument();
  });

  it("renders tooltip for all chart types", () => {
    const { container: barContainer } = render(
      <ChartRenderer chart={mockBarChartData} />,
    );
    expect(
      barContainer.querySelector(".recharts-tooltip-wrapper"),
    ).toBeInTheDocument();

    const { container: lineContainer } = render(
      <ChartRenderer chart={mockLineChartData} />,
    );
    expect(
      lineContainer.querySelector(".recharts-tooltip-wrapper"),
    ).toBeInTheDocument();

    const { container: pieContainer } = render(
      <ChartRenderer chart={mockPieChartData} />,
    );
    expect(
      pieContainer.querySelector(".recharts-tooltip-wrapper"),
    ).toBeInTheDocument();

    const { container: areaContainer } = render(
      <ChartRenderer chart={mockAreaChartData} />,
    );
    expect(
      areaContainer.querySelector(".recharts-tooltip-wrapper"),
    ).toBeInTheDocument();
  });

  it("renders CartesianGrid for bar, line, and area charts", () => {
    const { container: barContainer } = render(
      <ChartRenderer chart={mockBarChartData} />,
    );
    expect(
      barContainer.querySelector(".recharts-cartesian-grid"),
    ).toBeInTheDocument();

    const { container: lineContainer } = render(
      <ChartRenderer chart={mockLineChartData} />,
    );
    expect(
      lineContainer.querySelector(".recharts-cartesian-grid"),
    ).toBeInTheDocument();

    const { container: areaContainer } = render(
      <ChartRenderer chart={mockAreaChartData} />,
    );
    expect(
      areaContainer.querySelector(".recharts-cartesian-grid"),
    ).toBeInTheDocument();
  });

  it("does not render CartesianGrid for pie chart", () => {
    const { container } = render(<ChartRenderer chart={mockPieChartData} />);
    expect(
      container.querySelector(".recharts-cartesian-grid"),
    ).not.toBeInTheDocument();
  });

  it("renders XAxis and YAxis for bar, line, and area charts", () => {
    const { container: barContainer } = render(
      <ChartRenderer chart={mockBarChartData} />,
    );
    expect(barContainer.querySelector(".recharts-xAxis")).toBeInTheDocument();
    expect(barContainer.querySelector(".recharts-yAxis")).toBeInTheDocument();

    const { container: lineContainer } = render(
      <ChartRenderer chart={mockLineChartData} />,
    );
    expect(lineContainer.querySelector(".recharts-xAxis")).toBeInTheDocument();
    expect(lineContainer.querySelector(".recharts-yAxis")).toBeInTheDocument();

    const { container: areaContainer } = render(
      <ChartRenderer chart={mockAreaChartData} />,
    );
    expect(areaContainer.querySelector(".recharts-xAxis")).toBeInTheDocument();
    expect(areaContainer.querySelector(".recharts-yAxis")).toBeInTheDocument();
  });
});
