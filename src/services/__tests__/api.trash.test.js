import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "../../test/mocks/handlers";
import {
  extractChartFilename,
  deleteChart,
  listTrash,
  restoreChart,
} from "../api";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("extractChartFilename", () => {
  it("extracts filename from full URL", () => {
    const url = "http://localhost:8000/static/charts/chart_1234567890.png";
    expect(extractChartFilename(url)).toBe("chart_1234567890");
  });

  it("extracts filename from path only", () => {
    const url = "/static/charts/chart_abc123.png";
    expect(extractChartFilename(url)).toBe("chart_abc123");
  });

  it("handles complex chart names", () => {
    const url =
      "http://localhost:8000/static/charts/chart_1706000000000_abc.png";
    expect(extractChartFilename(url)).toBe("chart_1706000000000_abc");
  });

  it("returns null for invalid URLs", () => {
    expect(extractChartFilename(null)).toBeNull();
    expect(extractChartFilename("")).toBeNull();
    expect(
      extractChartFilename("http://localhost:8000/other/file.png"),
    ).toBeNull();
  });

  it("returns null for non-chart filenames", () => {
    expect(extractChartFilename("/static/images/logo.png")).toBeNull();
  });
});

describe("deleteChart", () => {
  it("successfully deletes a chart", async () => {
    const result = await deleteChart("chart_test123");

    expect(result.success).toBe(true);
    expect(result.message).toBe("Chart moved to trash");
    expect(result.filename).toBe("chart_test123.png");
  });

  it("works with .png extension in filename", async () => {
    const result = await deleteChart("chart_test123.png");

    expect(result.success).toBe(true);
  });

  it("throws error for nonexistent chart", async () => {
    await expect(deleteChart("chart_nonexistent")).rejects.toThrow(
      "Chart not found",
    );
  });
});

describe("listTrash", () => {
  it("returns list of trashed items", async () => {
    const result = await listTrash();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].filename).toBe("chart_deleted1.png");
    expect(result.items[0].deleted_at).toBe("2026-01-01T12:00:00");
    expect(result.items[0].expires_at).toBe("2026-01-08T12:00:00");
    expect(result.items[0].metadata).toEqual({ title: "Deleted Chart 1" });
    expect(result.purged_count).toBe(0);
  });
});

describe("restoreChart", () => {
  it("successfully restores a chart", async () => {
    const result = await restoreChart("chart_deleted1");

    expect(result.success).toBe(true);
    expect(result.message).toBe("Chart restored successfully");
    expect(result.chart_url).toBe("/static/charts/chart_deleted1.png");
    expect(result.chart_metadata).toEqual({ title: "Restored Chart" });
  });

  it("works with .png extension in filename", async () => {
    const result = await restoreChart("chart_deleted1.png");

    expect(result.success).toBe(true);
  });

  it("throws error for nonexistent chart in trash", async () => {
    await expect(restoreChart("chart_nonexistent")).rejects.toThrow(
      "Chart not found in trash",
    );
  });
});
