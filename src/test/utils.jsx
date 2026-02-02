import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Custom render function that clears localStorage before each test
 * and provides common utilities
 */
export function renderWithCleanState(ui, options = {}) {
  // Clear localStorage before each render
  localStorage.clear();

  // Set up any initial localStorage state if provided
  if (options.initialLocalStorage) {
    Object.entries(options.initialLocalStorage).forEach(([key, value]) => {
      localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    });
  }

  return {
    user: userEvent.setup(),
    ...render(ui, options),
  };
}

/**
 * Helper to mock localStorage with custom implementations
 */
export function mockLocalStorage() {
  let store = {};

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
}

/**
 * Helper to create mock chart data
 */
export function createMockChart(overrides = {}) {
  return {
    id: Date.now(),
    type: "bar",
    imageUrl: "data:image/png;base64,mockImageData",
    ...overrides,
  };
}

/**
 * Helper to create mock user data
 */
export function createMockUserData(overrides = {}) {
  return {
    columns: ["Name", "Value", "Category"],
    data: [
      ["Product A", 100, "Electronics"],
      ["Product B", 200, "Furniture"],
      ["Product C", 150, "Electronics"],
    ],
    ...overrides,
  };
}

/**
 * Helper to wait for async operations
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Helper to create a mock file for upload testing
 */
export function createMockFile(
  name = "test.csv",
  content = "col1,col2\nval1,val2",
  type = "text/csv",
) {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

/**
 * Helper to mock Google API script loading
 */
export function mockGoogleAPI() {
  const mockTokenClient = {
    requestAccessToken: vi.fn(),
  };

  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn(() => mockTokenClient),
        revoke: vi.fn((token, callback) => callback()),
      },
    },
  };

  return { mockTokenClient };
}

/**
 * Helper to clean up Google API mock
 */
export function cleanupGoogleAPI() {
  delete window.google;
}

/**
 * Helper to mock html-to-image toPng function
 */
export function mockHtmlToImage() {
  return {
    toPng: vi.fn(() => Promise.resolve("data:image/png;base64,mockImageData")),
  };
}
