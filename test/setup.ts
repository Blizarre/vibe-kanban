import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Global test setup
beforeEach(() => {
  // Reset the mock between tests
  mockFetch.mockClear();
});

afterEach(() => {
  vi.resetAllMocks();
});