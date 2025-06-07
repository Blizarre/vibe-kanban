import "@testing-library/jest-dom";

// Global test setup
beforeEach(() => {
  // Mock fetch for API calls
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.resetAllMocks();
});