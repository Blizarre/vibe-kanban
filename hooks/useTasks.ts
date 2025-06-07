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
  moveTask: (taskId: string, newColumnId: ColumnId, newIndex: number) => Promise<boolean>;
}

export const useTasks = (): UseTasksResult => {
  const [tasksByColumn, setTasksByColumn] = useState<Record<string, Task[]>>({});
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

  const addTask = useCallback(async (columnId: ColumnId): Promise<Task | null> => {
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
      await fetchTasks(); // Refresh tasks
      return createdTask;
    } catch (e) {
      console.error("Failed to add task:", e);
      setError(e instanceof Error ? e.message : "Failed to add task");
      return null;
    }
  }, [fetchTasks]);

  const updateTask = useCallback(async (updatedTask: Task): Promise<boolean> => {
    const { id, title, description } = updatedTask;
    const payload = { title, description };

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchTasks(); // Refresh tasks
      return true;
    } catch (e) {
      console.error("Failed to save task:", e);
      setError(e instanceof Error ? e.message : "Failed to save task");
      return false;
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchTasks(); // Refresh tasks
      return true;
    } catch (e) {
      console.error("Failed to delete task:", e);
      setError(e instanceof Error ? e.message : "Failed to delete task");
      return false;
    }
  }, [fetchTasks]);

  const moveTask = useCallback(async (
    taskId: string,
    newColumnId: ColumnId,
    newIndex: number
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_column_id: newColumnId,
          new_index: newIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchTasks(); // Refresh tasks
      return true;
    } catch (e) {
      console.error("Failed to move task:", e);
      setError(e instanceof Error ? e.message : "Failed to move task");
      return false;
    }
  }, [fetchTasks]);

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