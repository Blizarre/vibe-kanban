import { useState, useEffect, useCallback } from "react";
import { Task, ColumnId } from "../types";
import { API_BASE_URL, checkResponse, optimisticMutate } from "./api";

export interface UseTasksResult {
  tasksByColumn: Record<string, Task[]>;
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (columnId: ColumnId) => Promise<Task | null>;
  updateTask: (task: Task) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  emptyColumn: (columnId: ColumnId) => Promise<boolean>;
  moveTask: (
    taskId: string,
    newColumnId: ColumnId,
    newIndex: number,
  ) => Promise<boolean>;
}

// Helper to find and update a task in the state
function updateTaskInState(
  state: Record<string, Task[]>,
  taskId: string,
  updateFn: (task: Task) => Task | null, // null means remove
): Record<string, Task[]> {
  const newState = { ...state };
  for (const columnId in newState) {
    const tasks = newState[columnId] || [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const updated = updateFn(tasks[idx]);
      if (updated === null) {
        newState[columnId] = [...tasks.slice(0, idx), ...tasks.slice(idx + 1)];
      } else {
        newState[columnId] = [
          ...tasks.slice(0, idx),
          updated,
          ...tasks.slice(idx + 1),
        ];
      }
      break;
    }
  }
  return newState;
}

export const useTasks = (): UseTasksResult => {
  const [tasksByColumn, setTasksByColumn] = useState<Record<string, Task[]>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((e: Error) => setError(e.message), []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`);
      checkResponse(response, true);
      const data: Record<string, Task[]> = await response.json();
      setTasksByColumn(data);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setTasksByColumn({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (columnId: ColumnId): Promise<Task | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "",
            description: "",
            column_id: columnId,
            category_id: null,
          }),
        });
        checkResponse(response, true);
        const createdTask: Task = await response.json();

        setTasksByColumn((prev) => ({
          ...prev,
          [columnId]: [...(prev[columnId] || []), createdTask],
        }));

        return createdTask;
      } catch (e) {
        console.error("Failed to add task:", e);
        setError(e instanceof Error ? e.message : "Failed to add task");
        return null;
      }
    },
    [],
  );

  const updateTask = useCallback(
    async (updatedTask: Task): Promise<boolean> => {
      const { id, title, description, category_id } = updatedTask;
      const optimisticState = updateTaskInState(
        tasksByColumn,
        id,
        () => updatedTask,
      );

      return optimisticMutate(
        tasksByColumn,
        setTasksByColumn,
        optimisticState,
        () =>
          fetch(`${API_BASE_URL}/api/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, category_id }),
          }),
        handleError,
      );
    },
    [tasksByColumn, handleError],
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      const optimisticState = updateTaskInState(
        tasksByColumn,
        taskId,
        () => null,
      );

      return optimisticMutate(
        tasksByColumn,
        setTasksByColumn,
        optimisticState,
        () =>
          fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: "DELETE",
          }),
        handleError,
      );
    },
    [tasksByColumn, handleError],
  );

  const moveTask = useCallback(
    async (
      taskId: string,
      newColumnId: ColumnId,
      newIndex: number,
    ): Promise<boolean> => {
      // Find the task to move
      let movedTask: Task | null = null;
      for (const columnId in tasksByColumn) {
        const task = (tasksByColumn[columnId] || []).find(
          (t) => t.id === taskId,
        );
        if (task) {
          movedTask = task;
          break;
        }
      }

      if (!movedTask) {
        console.error("Task not found for move operation");
        return false;
      }

      // Build optimistic state: remove from old, insert at new position
      let optimisticState = updateTaskInState(
        tasksByColumn,
        taskId,
        () => null,
      );
      const newColumnTasks = [...(optimisticState[newColumnId] || [])];
      newColumnTasks.splice(newIndex, 0, movedTask);
      optimisticState = { ...optimisticState, [newColumnId]: newColumnTasks };

      return optimisticMutate(
        tasksByColumn,
        setTasksByColumn,
        optimisticState,
        () =>
          fetch(`${API_BASE_URL}/api/tasks/${taskId}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_column_id: newColumnId,
              new_index: newIndex,
            }),
          }),
        handleError,
      );
    },
    [tasksByColumn, handleError],
  );

  const emptyColumn = useCallback(
    async (columnId: ColumnId): Promise<boolean> => {
      const optimisticState = { ...tasksByColumn, [columnId]: [] };

      return optimisticMutate(
        tasksByColumn,
        setTasksByColumn,
        optimisticState,
        () =>
          fetch(`${API_BASE_URL}/api/columns/${columnId}/empty`, {
            method: "DELETE",
          }),
        handleError,
      );
    },
    [tasksByColumn, handleError],
  );

  return {
    tasksByColumn,
    isLoading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    emptyColumn,
    moveTask,
  };
};
