import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock the environment before importing the hook
vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id-123");

import { useGoogleAuth } from "../useGoogleAuth";

describe("useGoogleAuth", () => {
  let mockTokenClient;
  let mockGoogleAPI;

  beforeEach(() => {
    // Clear any existing scripts
    document.body.innerHTML = "";

    // Create mock token client
    mockTokenClient = {
      requestAccessToken: vi.fn(),
    };

    // Create mock Google API
    mockGoogleAPI = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((config) => {
            // Store callback for later use
            mockGoogleAPI._tokenCallback = config.callback;
            return mockTokenClient;
          }),
          revoke: vi.fn((token, callback) => {
            callback();
          }),
        },
      },
      _tokenCallback: null,
    };

    // Mock fetch for user info
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            email: "test@example.com",
            name: "Test User",
            picture: "https://example.com/avatar.jpg",
          }),
      }),
    );
  });

  afterEach(() => {
    delete window.google;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("initializes with loading state", () => {
    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
  });

  it("loads Google Identity Services script", () => {
    renderHook(() => useGoogleAuth());

    const scripts = document.querySelectorAll(
      'script[src*="accounts.google.com"]',
    );
    expect(scripts.length).toBeGreaterThan(0);
  });

  it("initializes Google auth when script loads", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGoogleAPI.accounts.oauth2.initTokenClient).toHaveBeenCalled();
  });

  it("sets isConfigured to true when client ID is present", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isConfigured).toBe(true);
    });
  });

  it("sets isConfigured to true when client ID is configured in environment", async () => {
    // CLIENT_ID is set globally in vitest.config.js
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isConfigured).toBe(true);
  });

  it("provides signIn function", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.signIn).toBeInstanceOf(Function);
  });

  it("provides signOut function", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.signOut).toBeInstanceOf(Function);
  });

  it("requests access token when signIn is called", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.signIn();

    expect(mockTokenClient.requestAccessToken).toHaveBeenCalled();
  });

  it("updates state when access token is received", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate token callback
    mockGoogleAPI._tokenCallback({ access_token: "test-token-123" });

    await waitFor(() => {
      expect(result.current.isSignedIn).toBe(true);
      expect(result.current.accessToken).toBe("test-token-123");
    });
  });

  it("fetches user info after receiving token", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate token callback
    mockGoogleAPI._tokenCallback({ access_token: "test-token-123" });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-token-123" },
        }),
      );
    });
  });

  it("sets user info after fetching", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate token callback
    mockGoogleAPI._tokenCallback({ access_token: "test-token-123" });

    await waitFor(() => {
      expect(result.current.user).toEqual({
        email: "test@example.com",
        name: "Test User",
        picture: "https://example.com/avatar.jpg",
      });
    });
  });

  it("revokes token when signOut is called", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Sign in first
    mockGoogleAPI._tokenCallback({ access_token: "test-token-123" });

    await waitFor(() => {
      expect(result.current.isSignedIn).toBe(true);
    });

    // Sign out
    result.current.signOut();

    expect(mockGoogleAPI.accounts.oauth2.revoke).toHaveBeenCalledWith(
      "test-token-123",
      expect.any(Function),
    );
  });

  it("clears state after signOut", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Sign in first
    mockGoogleAPI._tokenCallback({ access_token: "test-token-123" });

    await waitFor(() => {
      expect(result.current.isSignedIn).toBe(true);
    });

    // Sign out
    result.current.signOut();

    await waitFor(() => {
      expect(result.current.isSignedIn).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  it("cleans up script on unmount", () => {
    const { unmount } = renderHook(() => useGoogleAuth());

    const scriptsBefore = document.querySelectorAll(
      'script[src*="accounts.google.com"]',
    );
    expect(scriptsBefore.length).toBeGreaterThan(0);

    unmount();

    const scriptsAfter = document.querySelectorAll(
      'script[src*="accounts.google.com"]',
    );
    expect(scriptsAfter.length).toBe(0);
  });

  it("handles errors during initialization gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load with broken Google API
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: () => {
            throw new Error("Init failed");
          },
        },
      },
    };

    const script = document.querySelector('script[src*="accounts.google.com"]');
    script?.dispatchEvent(new Event("load"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("handles fetch errors when getting user info", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

    const { result } = renderHook(() => useGoogleAuth());

    // Simulate script load
    window.google = mockGoogleAPI;
    const script = document.querySelector('script[src*="accounts.google.com"]');
    await act(async () => {
      if (script && script.onload) {
        script.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate token callback
    mockGoogleAPI._tokenCallback({ access_token: "test-token-123" });

    await waitFor(() => {
      expect(result.current.isSignedIn).toBe(true);
    });

    // User should not be set due to fetch error
    expect(result.current.user).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("does not call requestAccessToken if token client is not initialized", async () => {
    const { result } = renderHook(() => useGoogleAuth());

    // Don't initialize Google API
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Try to sign in before initialization
    result.current.signIn();

    // Should not crash or call anything
    expect(mockTokenClient.requestAccessToken).not.toHaveBeenCalled();
  });
});
