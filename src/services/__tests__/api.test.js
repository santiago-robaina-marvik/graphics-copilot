import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getOrCreateSessionId,
  resetSession,
  sendChatMessage,
  getChartImageUrl,
  checkHealth,
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
        json: async () => ({ detail: "Server error" }),
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
});
