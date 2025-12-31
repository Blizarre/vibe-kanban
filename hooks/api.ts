// Shared API utilities for hooks

// Use environment variable for API base URL, fallback to current origin or localhost
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

// Use environment variable for login url, disable if unset
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || null;

/**
 * Check API response and handle errors including auth redirects.
 */
export function checkResponse(
  response: Response,
  redirectOnAuth: boolean,
): void {
  if (response.status === 401) {
    if (redirectOnAuth && LOGIN_URL) {
      window.location.href = LOGIN_URL;
      return;
    }
    throw new Error(
      `HTTP error: ${response.status} - Invalid auth. Please refresh the page`,
    );
  }
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Perform an optimistic mutation with automatic rollback on failure.
 */
export async function optimisticMutate<T>(
  currentState: T,
  setState: (state: T) => void,
  optimisticState: T,
  apiCall: () => Promise<Response>,
  onError: (error: Error) => void,
  redirectOnAuth = false,
): Promise<boolean> {
  setState(optimisticState);

  try {
    const response = await apiCall();
    checkResponse(response, redirectOnAuth);
    return true;
  } catch (e) {
    console.error("Optimistic update failed:", e);
    onError(e instanceof Error ? e : new Error(String(e)));
    setState(currentState);
    return false;
  }
}
