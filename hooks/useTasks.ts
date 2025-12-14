import { useState, useEffect, useCallback } from "react";
import { Task, ColumnId } from "../types";

// Use environment variable for API base URL, fallback to current origin or localhost
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

// Use environment variable for login url, disable if unset
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || null;

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

function checkResponse(response, login) {
  if (response.status == 401) {
    // There is nothing that we can do at that point, we will assume that the
    // auth token needs refreshing. I will need to fix
    // this hack at some point. If we won't lose data, we can go to the login
    // page if there is one. If no we will display a message instructing the user
    // to refresh the page

    if (login && LOGIN_URL) {
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
        checkResponse(response, true);
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

      // Store original state for rollback
      const originalState = tasksByColumn;

      // Apply optimistic update
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
        checkResponse(response, false);
        return true;
      } catch (e) {
        console.error("Optimistic update failed:", e);
        setError(e instanceof Error ? e.message : "Failed to update task");
        setTasksByColumn(originalState);
        return false;
      }
    },
    [tasksByColumn],
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      // Store original state for rollback
      const originalState = tasksByColumn;

      // Apply optimistic update
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
        checkResponse(response, false);
        return true;
      } catch (e) {
        console.error("Optimistic update failed:", e);
        setError(e instanceof Error ? e.message : "Failed to delete task");
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
      // Store original state for rollback
      const originalState = tasksByColumn;

      // Apply optimistic update
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
        checkResponse(response, false);
        return true;
      } catch (e) {
        console.error("Optimistic update failed:", e);
        setError(e instanceof Error ? e.message : "Failed to move task");
        setTasksByColumn(originalState);
        return false;
      }
    },
    [tasksByColumn],
  );

  const emptyColumn = useCallback(
    async (columnId: ColumnId): Promise<boolean> => {
      // Store original state for rollback
      const originalState = tasksByColumn;

      // Apply optimistic update
      const updatedState = { ...tasksByColumn };
      updatedState[columnId] = [];
      setTasksByColumn(updatedState);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/columns/${columnId}/empty`,
          {
            method: "DELETE",
          },
        );
        checkResponse(response, false);
        return true;
      } catch (e) {
        console.error("Optimistic update failed:", e);
        setError(e instanceof Error ? e.message : "Failed to empty column");
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
    emptyColumn,
    moveTask,
  };
};
