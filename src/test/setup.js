import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ClipboardItem
global.ClipboardItem = vi.fn().mockImplementation((items) => items);

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    write: vi.fn().mockResolvedValue(undefined),
    writeText: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
    readText: vi.fn().mockResolvedValue(""),
  },
  writable: false,
  configurable: true,
});

// Mock Element.prototype.scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock getBoundingClientRect for Recharts ResponsiveContainer
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 800,
  height: 400,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: () => {},
}));
