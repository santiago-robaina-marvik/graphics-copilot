import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getOrCreateSessionId,
  resetSession,
  sendChatMessage,
  getChartImageUrl,
  checkHealth,
  regenerateChart,
  parseSheetUrl,
} from "../api";

describe("api service", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOrCreateSessionId", () => {
    it("creates a new session ID if none exists", () => {
      const sessionId = getOrCreateSessionId();
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session_/);
    });

    it("retrieves existing session ID from localStorage", () => {
      const existingId = "session_123_abc";
      localStorage.setItem("chatSessionId", existingId);

      const sessionId = getOrCreateSessionId();
      expect(sessionId).toBe(existingId);
    });

    it("persists new session ID to localStorage", () => {
      const sessionId = getOrCreateSessionId();
      const stored = localStorage.getItem("chatSessionId");
      expect(stored).toBe(sessionId);
    });
  });

  describe("resetSession", () => {
    it("generates a new session ID", () => {
      const oldId = getOrCreateSessionId();
      const newId = resetSession();

      expect(newId).not.toBe(oldId);
      expect(newId).toMatch(/^session_/);
    });

    it("saves new session ID to localStorage", () => {
      const newId = resetSession();
      const stored = localStorage.getItem("chatSessionId");
      expect(stored).toBe(newId);
    });
  });

  describe("sendChatMessage", () => {
    it("sends POST request to /api/chat endpoint", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: "Test response" }),
      });

      await sendChatMessage("Test message", "session_123", null);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/chat"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("includes message, session_id, and data in request body", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: "Test response" }),
      });

      const testData = [{ name: "A", value: 100 }];
      await sendChatMessage("Test message", "session_123", testData);

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.message).toBe("Test message");
      expect(body.session_id).toBe("session_123");
      expect(body.data).toEqual(testData);
    });

    it("returns parsed JSON response on success", async () => {
      const mockResponse = { response: "Test response", chartData: {} };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await sendChatMessage("Test", "session_123", null);

      expect(result).toEqual(mockResponse);
    });

    it("throws error when response is not ok", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      await expect(
        sendChatMessage("Test", "session_123", null),
      ).rejects.toThrow("Server error");
    });

    it("throws generic error when response json parsing fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Parse error");
        },
      });

      await expect(
        sendChatMessage("Test", "session_123", null),
      ).rejects.toThrow();
    });

    it("handles null data parameter", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: "Test" }),
      });

      await sendChatMessage("Test message", "session_123");

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.data).toBe(null);
    });

    it("should include sheet_id and sheet_gid when sheetSource provided", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "OK", session_id: "s1" }),
      });

      await sendChatMessage("hello", "session1", null, "meli_dark", {
        sheet_id: "sheet123",
        sheet_gid: "42",
      });

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.sheet_id).toBe("sheet123");
      expect(callBody.sheet_gid).toBe("42");
    });

    it("should send null sheet info when no sheetSource", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "OK", session_id: "s1" }),
      });

      await sendChatMessage("hello", "session1", null, "meli_dark", null);

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.sheet_id).toBeNull();
      expect(callBody.sheet_gid).toBeNull();
    });
  });

  describe("parseSheetUrl", () => {
    it("should extract sheet_id from basic URL", () => {
      const url =
        "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
      const result = parseSheetUrl(url);
      expect(result.sheet_id).toBe(
        "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      );
      expect(result.sheet_gid).toBe("0");
    });

    it("should extract gid from URL with tab", () => {
      const url = "https://docs.google.com/spreadsheets/d/abc123/edit#gid=456";
      const result = parseSheetUrl(url);
      expect(result.sheet_id).toBe("abc123");
      expect(result.sheet_gid).toBe("456");
    });

    it("should return null for non-Google-Sheets URL", () => {
      expect(parseSheetUrl("https://example.com")).toBeNull();
    });

    it("should return null for empty/null URL", () => {
      expect(parseSheetUrl("")).toBeNull();
      expect(parseSheetUrl(null)).toBeNull();
    });
  });

  describe("getChartImageUrl", () => {
    it("constructs full URL from chart path", () => {
      const chartPath = "/static/charts/chart_123.png";
      const url = getChartImageUrl(chartPath);

      expect(url).toContain(chartPath);
      expect(url).toMatch(/^http/);
    });

    it("returns null for null input", () => {
      expect(getChartImageUrl(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getChartImageUrl("")).toBeNull();
    });

    it("uses correct API_URL base", () => {
      const chartPath = "/static/charts/chart.png";
      const url = getChartImageUrl(chartPath);

      // Should use either VITE_API_URL or default localhost
      expect(url).toMatch(
        /^http:\/\/(localhost:8000|.+)\/static\/charts\/chart\.png$/,
      );
    });
  });

  describe("checkHealth", () => {
    it("returns true when health endpoint responds ok", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
      });

      const result = await checkHealth();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
      );
    });

    it("returns false when health endpoint fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
      });

      const result = await checkHealth();

      expect(result).toBe(false);
    });

    it("returns false when fetch throws error", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await checkHealth();

      expect(result).toBe(false);
    });
  });

  describe("composeLayout", () => {
    it("sends compose-layout request to backend", async () => {
      const { composeLayout } = await import("../api");

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          chart_url: "/static/charts/chart_layout_123.png",
          chart_metadata: {
            chart_type: "layout",
            layout_type: "split-horizontal",
            source: "template_editor",
            composed_from: ["chart_test_001", "chart_test_002"],
          },
        }),
      });

      const result = await composeLayout(
        ["chart_test_001", "chart_test_002"],
        "split-horizontal",
      );

      expect(result.success).toBe(true);
      expect(result.chart_url).toContain("chart_layout_");
      expect(result.chart_metadata.layout_type).toBe("split-horizontal");

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.chart_filenames).toEqual([
        "chart_test_001",
        "chart_test_002",
      ]);
      expect(body.layout_type).toBe("split-horizontal");
    });

    it("throws error on failed response", async () => {
      const { composeLayout } = await import("../api");

      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid layout type" }),
      });

      await expect(composeLayout(["chart_test"], "invalid")).rejects.toThrow(
        "Invalid layout type",
      );
    });
  });

  describe("regenerateChart", () => {
    it("should call /api/regenerate with correct parameters", async () => {
      const mockResponse = {
        chart_url: "/static/charts/chart_new.png",
        chart_metadata: {
          chart_type: "bar",
          x_column: "category",
          y_column: "value",
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const metadata = {
        chart_type: "bar",
        x_column: "category",
        y_column: "value",
        title: "Test Chart",
      };

      const result = await regenerateChart(metadata, "meli_dark");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/regenerate"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"chart_type":"bar"'),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw error on failed response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Column not found" }),
      });

      const metadata = { chart_type: "bar", x_column: "invalid" };

      await expect(regenerateChart(metadata)).rejects.toThrow(
        "Column not found",
      );
    });

    it("should include all metadata fields in request", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ chart_url: "/test.png", chart_metadata: {} }),
      });

      const metadata = {
        chart_type: "distribution",
        labels_column: "category",
        values_column: "sales",
        title: "Sales Distribution",
      };

      await regenerateChart(metadata, "meli_light");

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.chart_type).toBe("distribution");
      expect(body.labels_column).toBe("category");
      expect(body.values_column).toBe("sales");
      expect(body.title).toBe("Sales Distribution");
      expect(body.theme).toBe("meli_light");
    });

    it("should include sheet_id and sheet_gid from data_source", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            chart_url: "/static/charts/chart_new.png",
            chart_metadata: { chart_type: "bar" },
          }),
      });

      const metadata = {
        chart_type: "bar",
        x_column: "category",
        y_column: "value",
        data_source: {
          type: "google_sheets",
          sheet_id: "sheet123",
          sheet_gid: "42",
        },
      };

      await regenerateChart(metadata, "meli_dark");

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.sheet_id).toBe("sheet123");
      expect(callBody.sheet_gid).toBe("42");
    });

    it("should send null sheet_id when no data_source", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            chart_url: "/static/charts/chart_new.png",
            chart_metadata: { chart_type: "bar" },
          }),
      });

      const metadata = {
        chart_type: "bar",
        x_column: "category",
        y_column: "value",
      };

      await regenerateChart(metadata, "meli_dark");

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.sheet_id).toBeNull();
      expect(callBody.sheet_gid).toBeNull();
    });
  });
});
