import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractPresentationId,
  uploadImageToDrive,
  getFirstSlideId,
  createNewSlide,
  addImageToSlide,
  addChartToPresentation,
} from "../googleSlides";

describe("googleSlides service", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("extractPresentationId", () => {
    it("extracts presentation ID from edit URL", () => {
      const url =
        "https://docs.google.com/presentation/d/abc123xyz/edit#slide=id.p";
      const id = extractPresentationId(url);
      expect(id).toBe("abc123xyz");
    });

    it("extracts presentation ID from embed URL", () => {
      const url = "https://docs.google.com/presentation/d/abc123xyz/embed";
      const id = extractPresentationId(url);
      expect(id).toBe("abc123xyz");
    });

    it("handles URLs with additional parameters", () => {
      const url =
        "https://docs.google.com/presentation/d/abc123xyz/edit?usp=sharing&slide=id.p";
      const id = extractPresentationId(url);
      expect(id).toBe("abc123xyz");
    });

    it("returns null for invalid URL", () => {
      const url = "https://example.com/not-a-presentation";
      const id = extractPresentationId(url);
      expect(id).toBeNull();
    });

    it("returns null for null input", () => {
      const id = extractPresentationId(null);
      expect(id).toBeNull();
    });

    it("returns null for empty string", () => {
      const id = extractPresentationId("");
      expect(id).toBeNull();
    });

    it("handles presentation IDs with hyphens and underscores", () => {
      const url = "https://docs.google.com/presentation/d/abc-123_xyz/edit";
      const id = extractPresentationId(url);
      expect(id).toBe("abc-123_xyz");
    });
  });

  describe("uploadImageToDrive", () => {
    it("uploads image to Google Drive", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "drive-file-123" }),
      });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      const fileId = await uploadImageToDrive(
        "test-token",
        mockBlob,
        "chart.png",
      );

      expect(fileId).toBe("drive-file-123");
    });

    it("sends correct authorization header", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "drive-file-123" }),
      });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      await uploadImageToDrive("test-token", mockBlob, "chart.png");

      const uploadCall = global.fetch.mock.calls[0];
      expect(uploadCall[1].headers.Authorization).toBe("Bearer test-token");
    });

    it("sets file permissions to public", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "drive-file-123" }),
      });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      await uploadImageToDrive("test-token", mockBlob, "chart.png");

      // Second call should be to set permissions
      const permissionsCall = global.fetch.mock.calls[1];
      expect(permissionsCall[0]).toContain("/permissions");
      const permissionsBody = JSON.parse(permissionsCall[1].body);
      expect(permissionsBody.type).toBe("anyone");
      expect(permissionsBody.role).toBe("reader");
    });

    it("throws error when upload fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Upload failed" } }),
      });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });

      await expect(
        uploadImageToDrive("test-token", mockBlob, "chart.png"),
      ).rejects.toThrow("Upload failed");
    });

    it("uses default filename if not provided", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "drive-file-123" }),
      });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      await uploadImageToDrive("test-token", mockBlob);

      // Check that metadata includes default name
      const uploadCall = global.fetch.mock.calls[0];
      const formData = uploadCall[1].body;
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe("getFirstSlideId", () => {
    it("returns the last slide ID from presentation", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          slides: [
            { objectId: "slide1" },
            { objectId: "slide2" },
            { objectId: "slide3" },
          ],
        }),
      });

      const slideId = await getFirstSlideId("test-token", "pres-123");

      expect(slideId).toBe("slide3");
    });

    it("sends correct authorization header", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ slides: [{ objectId: "slide1" }] }),
      });

      await getFirstSlideId("test-token", "pres-123");

      const call = global.fetch.mock.calls[0];
      expect(call[1].headers.Authorization).toBe("Bearer test-token");
    });

    it("makes request to correct endpoint", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ slides: [{ objectId: "slide1" }] }),
      });

      await getFirstSlideId("test-token", "pres-123");

      const call = global.fetch.mock.calls[0];
      expect(call[0]).toContain("/presentations/pres-123");
    });

    it("returns null when presentation has no slides", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ slides: [] }),
      });

      const slideId = await getFirstSlideId("test-token", "pres-123");

      expect(slideId).toBeNull();
    });

    it("throws error when request fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: "Failed to get presentation" },
        }),
      });

      await expect(getFirstSlideId("test-token", "pres-123")).rejects.toThrow(
        "Failed to get presentation",
      );
    });
  });

  describe("createNewSlide", () => {
    it("creates a new blank slide", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          replies: [{ createSlide: { objectId: "new-slide-123" } }],
        }),
      });

      const slideId = await createNewSlide("test-token", "pres-123");

      expect(slideId).toBe("new-slide-123");
    });

    it("sends batchUpdate request", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          replies: [{ createSlide: { objectId: "new-slide-123" } }],
        }),
      });

      await createNewSlide("test-token", "pres-123");

      const call = global.fetch.mock.calls[0];
      expect(call[0]).toContain(":batchUpdate");
      expect(call[1].method).toBe("POST");
    });

    it("requests BLANK layout", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          replies: [{ createSlide: { objectId: "new-slide-123" } }],
        }),
      });

      await createNewSlide("test-token", "pres-123");

      const call = global.fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(
        body.requests[0].createSlide.slideLayoutReference.predefinedLayout,
      ).toBe("BLANK");
    });

    it("throws error when creation fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Failed to create slide" } }),
      });

      await expect(createNewSlide("test-token", "pres-123")).rejects.toThrow(
        "Failed to create slide",
      );
    });
  });

  describe("addImageToSlide", () => {
    it("adds image to specified slide", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await addImageToSlide(
        "test-token",
        "pres-123",
        "slide-456",
        "drive-file-789",
      );

      expect(global.fetch).toHaveBeenCalled();
      const call = global.fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.requests[0].createImage.url).toContain("drive-file-789");
    });

    it("sets image size and position", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await addImageToSlide(
        "test-token",
        "pres-123",
        "slide-456",
        "drive-file-789",
      );

      const call = global.fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      const imageProperties = body.requests[0].createImage.elementProperties;

      expect(imageProperties.size).toBeDefined();
      expect(imageProperties.transform).toBeDefined();
      expect(imageProperties.pageObjectId).toBe("slide-456");
    });

    it("throws error when adding image fails", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Failed to add image" } }),
      });

      await expect(
        addImageToSlide(
          "test-token",
          "pres-123",
          "slide-456",
          "drive-file-789",
        ),
      ).rejects.toThrow("Failed to add image");
    });
  });

  describe("addChartToPresentation", () => {
    it("orchestrates full workflow to add chart", async () => {
      global.fetch
        // Upload to Drive
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "drive-file-123" }),
        })
        // Set permissions
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        // Get slides
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ slides: [{ objectId: "slide-1" }] }),
        })
        // Add image
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      const result = await addChartToPresentation(
        "test-token",
        "pres-123",
        mockBlob,
      );

      expect(result.success).toBe(true);
      expect(result.slideId).toBe("slide-1");
      expect(result.driveFileId).toBe("drive-file-123");
    });

    it("creates new slide when createNewSlideFirst is true", async () => {
      global.fetch
        // Upload to Drive
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "drive-file-123" }),
        })
        // Set permissions
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        // Create new slide
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            replies: [{ createSlide: { objectId: "new-slide" } }],
          }),
        })
        // Add image
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      const result = await addChartToPresentation(
        "test-token",
        "pres-123",
        mockBlob,
        {
          createNewSlideFirst: true,
        },
      );

      expect(result.slideId).toBe("new-slide");
    });

    it("creates new slide if presentation has no slides", async () => {
      global.fetch
        // Upload to Drive
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "drive-file-123" }),
        })
        // Set permissions
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        // Get slides (empty)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ slides: [] }),
        })
        // Create new slide
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            replies: [{ createSlide: { objectId: "new-slide" } }],
          }),
        })
        // Add image
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const mockBlob = new Blob(["fake image data"], { type: "image/png" });
      const result = await addChartToPresentation(
        "test-token",
        "pres-123",
        mockBlob,
      );

      expect(result.slideId).toBe("new-slide");
    });
  });
});
