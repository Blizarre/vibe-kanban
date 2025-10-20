import "@testing-library/jest-dom";
import { vi } from "vitest";
import { configure } from "@testing-library/react";

// Configure testing library to avoid act warnings
configure({ asyncUtilTimeout: 2000 });

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location for tests
Object.defineProperty(window, "location", {
  value: {
    origin: "http://localhost:8000",
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Global test setup
beforeEach(() => {
  // Reset the mock between tests
  mockFetch.mockClear();
});

afterEach(() => {
  vi.resetAllMocks();
});
