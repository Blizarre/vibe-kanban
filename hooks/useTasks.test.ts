import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTasks } from "./useTasks";

// Get the mocked fetch from setup
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const mockTasksResponse = {
  ideas: [{ id: "1", title: "Task 1", description: "Description 1" }],
  selected: [{ id: "2", title: "Task 2", description: "Description 2" }],
};

describe("useTasks", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches tasks on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    const { result } = renderHook(() => useTasks());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tasksByColumn).toEqual({});

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasksByColumn).toEqual(mockTasksResponse);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/api/tasks");
  });

  it("handles fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.tasksByColumn).toEqual({});
  });

  it("handles HTTP error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("HTTP error! status: 500");
    expect(result.current.tasksByColumn).toEqual({});
  });

  it("adds a new task", async () => {
    const newTask = { id: "3", title: "", description: "" };

    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    // Mock add task
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newTask,
    });

    // Mock refetch after add
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockTasksResponse,
        ideas: [...mockTasksResponse.ideas, newTask],
      }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let addedTask;
    await act(async () => {
      addedTask = await result.current.addTask("ideas");
    });

    expect(addedTask).toEqual(newTask);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "",
        description: "",
        column_id: "ideas",
      }),
    });
  });

  it("updates a task", async () => {
    const updatedTask = {
      id: "1",
      title: "Updated",
      description: "Updated desc",
    };

    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    // Mock update task
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedTask,
    });

    // Mock refetch after update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.updateTask(updatedTask);
    });

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tasks/1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated",
          description: "Updated desc",
        }),
      },
    );
  });

  it("deletes a task", async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    // Mock delete task
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    // Mock refetch after delete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTasksResponse, ideas: [] }),
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteTask("1");
    });

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tasks/1",
      {
        method: "DELETE",
      },
    );
  });

  it("moves a task", async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    // Mock move task
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse.ideas[0],
    });

    // Mock refetch after move
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.moveTask("1", "selected", 0);
    });

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tasks/1/move",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_column_id: "selected",
          new_index: 0,
        }),
      },
    );
  });

  it("handles API operation failures", async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksResponse,
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock failed add
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    let addedTask;
    await act(async () => {
      addedTask = await result.current.addTask("ideas");
    });
    expect(addedTask).toBe(null);
    expect(result.current.error).toBe("HTTP error! status: 400");
  });
});
