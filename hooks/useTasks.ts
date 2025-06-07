import { useState, useEffect, useCallback } from "react";
import { Task, ColumnId } from "../types";

const API_BASE_URL = "http://localhost:8000";

export interface UseTasksResult {
  tasksByColumn: Record<string, Task[]>;
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (columnId: ColumnId) => Promise<Task | null>;
  updateTask: (task: Task) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  moveTask: (
    taskId: string,
    newColumnId: ColumnId,
    newIndex: number,
  ) => Promise<boolean>;
}

export const useTasks = (): UseTasksResult => {
  const [tasksByColumn, setTasksByColumn] = useState<Record<string, Task[]>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
      const newTaskPayload = {
        title: "",
        description: "",
        column_id: columnId,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTaskPayload),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const createdTask: Task = await response.json();

        // Optimistically add the task to the UI
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
      const { id, title, description } = updatedTask;
      const payload = { title, description };

      // Store original state for potential rollback
      const originalState = { ...tasksByColumn };

      // Optimistically update the task in the UI
      const updatedState = { ...tasksByColumn };
      for (const columnId in updatedState) {
        const columnTasks = updatedState[columnId] || [];
        const taskIndex = columnTasks.findIndex((t) => t.id === id);
        if (taskIndex !== -1) {
          updatedState[columnId] = [
            ...columnTasks.slice(0, taskIndex),
            updatedTask,
            ...columnTasks.slice(taskIndex + 1),
          ];
          break;
        }
      }
      setTasksByColumn(updatedState);

      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Success - optimistic update was correct
        return true;
      } catch (e) {
        console.error("Failed to save task:", e);
        setError(e instanceof Error ? e.message : "Failed to save task");

        // Rollback optimistic update on failure
        setTasksByColumn(originalState);
        return false;
      }
    },
    [tasksByColumn],
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      // Store original state for potential rollback
      const originalState = { ...tasksByColumn };

      // Optimistically remove the task from the UI
      const updatedState = { ...tasksByColumn };
      for (const columnId in updatedState) {
        const columnTasks = updatedState[columnId] || [];
        const taskIndex = columnTasks.findIndex((t) => t.id === taskId);
        if (taskIndex !== -1) {
          updatedState[columnId] = [
            ...columnTasks.slice(0, taskIndex),
            ...columnTasks.slice(taskIndex + 1),
          ];
          break;
        }
      }
      setTasksByColumn(updatedState);

      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Success - optimistic update was correct
        return true;
      } catch (e) {
        console.error("Failed to delete task:", e);
        setError(e instanceof Error ? e.message : "Failed to delete task");

        // Rollback optimistic update on failure
        setTasksByColumn(originalState);
        return false;
      }
    },
    [tasksByColumn],
  );

  const moveTask = useCallback(
    async (
      taskId: string,
      newColumnId: ColumnId,
      newIndex: number,
    ): Promise<boolean> => {
      // Store original state for potential rollback
      const originalState = { ...tasksByColumn };

      // Optimistically update the UI immediately
      const updatedState = { ...tasksByColumn };

      // Find and remove the task from its current column
      let movedTask: Task | null = null;
      for (const columnId in updatedState) {
        const columnTasks = updatedState[columnId] || [];
        const taskIndex = columnTasks.findIndex((t) => t.id === taskId);
        if (taskIndex !== -1) {
          movedTask = columnTasks[taskIndex];
          updatedState[columnId] = [
            ...columnTasks.slice(0, taskIndex),
            ...columnTasks.slice(taskIndex + 1),
          ];
          break;
        }
      }

      if (!movedTask) {
        console.error("Task not found for move operation");
        return false;
      }

      // Add the task to the new column at the specified index
      if (!updatedState[newColumnId]) {
        updatedState[newColumnId] = [];
      }

      const newColumnTasks = [...updatedState[newColumnId]];
      newColumnTasks.splice(newIndex, 0, movedTask);
      updatedState[newColumnId] = newColumnTasks;

      // Apply optimistic update immediately
      setTasksByColumn(updatedState);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tasks/${taskId}/move`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_column_id: newColumnId,
              new_index: newIndex,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Success - the optimistic update was correct, no need to refresh
        return true;
      } catch (e) {
        console.error("Failed to move task:", e);
        setError(e instanceof Error ? e.message : "Failed to move task");

        // Rollback optimistic update on failure
        setTasksByColumn(originalState);
        return false;
      }
    },
    [tasksByColumn],
  );

  return {
    tasksByColumn,
    isLoading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
  };
};
