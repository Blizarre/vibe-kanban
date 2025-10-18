import { useCallback } from "react";

export interface OptimisticUpdateOptions<T> {
  optimisticUpdate: (currentState: T) => T;
  apiCall: () => Promise<unknown>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useOptimisticUpdate = <T>(
  getCurrentState: () => T,
  setState: (state: T) => void,
  setError: (error: string | null) => void,
) => {
  return useCallback(
    async (options: OptimisticUpdateOptions<T>): Promise<boolean> => {
      const { optimisticUpdate, apiCall, onSuccess, onError } = options;

      // Get current state at the time of the operation
      const currentState = getCurrentState();

      // Store original state for potential rollback
      const originalState = currentState;

      // Apply optimistic update immediately
      const updatedState = optimisticUpdate(currentState);
      setState(updatedState);

      try {
        await apiCall();

        // Success - optimistic update was correct
        if (onSuccess) {
          onSuccess();
        }
        return true;
      } catch (e) {
        const error =
          e instanceof Error ? e : new Error("Unknown error occurred");
        console.error("Optimistic update failed:", error);
        setError(error.message);

        // Rollback optimistic update on failure
        setState(originalState);

        if (onError) {
          onError(error);
        }
        return false;
      }
    },
    [getCurrentState, setState, setError],
  );
};
