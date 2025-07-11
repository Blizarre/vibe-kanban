import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "./test/utils";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Get the mocked fetch from setup
const mockFetch = global.fetch as any;

const mockTasksResponse = {
  ideas: [
    { id: "task1", title: "Plan project", description: "Outline phases" },
  ],
  selected: [
    { id: "task2", title: "Develop API", description: "Implement endpoints" },
  ],
  in_progress: [],
  parked: [],
  done: [],
};

describe("App Integration", () => {
  beforeEach(() => {
    mockFetch.mockClear();

    // Default successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTasksResponse,
    });
  });

  it("renders loading state initially", () => {
    act(() => {
      render(<App />);
    });

    expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
  });

  it("renders kanban board after loading tasks", async () => {
    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Check that the board is rendered
    expect(screen.getByText("🚀 KanFlow")).toBeInTheDocument();

    // Check that columns are rendered
    expect(screen.getByText("💡 Ideas")).toBeInTheDocument();
    expect(screen.getByText("🎯 Selected")).toBeInTheDocument();
    expect(screen.getByText("⚙️ In Progress")).toBeInTheDocument();
    expect(screen.getByText("🅿️ Parked")).toBeInTheDocument();
    expect(screen.getByText("✅ Done")).toBeInTheDocument();

    // Check that tasks are rendered
    expect(screen.getByText("Plan project")).toBeInTheDocument();
    expect(screen.getByText("Develop API")).toBeInTheDocument();
  });

  it("displays error message when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("opens task modal when task is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Click on a task
    await user.click(screen.getByText("Plan project"));

    // Check that modal opens with task details
    expect(screen.getByDisplayValue("Plan project")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("closes task modal when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Open modal
    await user.click(screen.getByText("Plan project"));
    expect(screen.getByDisplayValue("Plan project")).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByDisplayValue("Plan project")).not.toBeInTheDocument();
  });

  it("creates new task when add button is clicked", async () => {
    const user = userEvent.setup();

    // Mock successful task creation
    const newTask = { id: "task3", title: "", description: "" };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockTasksResponse }) // Initial fetch
      .mockResolvedValueOnce({ ok: true, json: async () => newTask }) // Create task
      .mockResolvedValueOnce({
        // Refetch after create
        ok: true,
        json: async () => ({
          ...mockTasksResponse,
          ideas: [...mockTasksResponse.ideas, newTask],
        }),
      });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Click add button in Ideas column
    const addButtons = screen.getAllByRole("button", { name: /Add new task/i });
    await user.click(addButtons[0]); // First add button (Ideas column)

    // Verify API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "",
            description: "",
            column_id: "ideas",
          }),
        }),
      );
    });
  });

  it("saves task changes when save button is clicked", async () => {
    const user = userEvent.setup();

    // Mock successful task update
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockTasksResponse }) // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "task1",
          title: "Updated Title",
          description: "Updated Description",
        }),
      }) // Update task
      .mockResolvedValueOnce({ ok: true, json: async () => mockTasksResponse }); // Refetch after update

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Open task modal
    await user.click(screen.getByText("Plan project"));

    // Edit task
    const titleInput = screen.getByDisplayValue("Plan project");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");

    // Switch to edit mode and edit description
    const toggleButton = screen.getByTitle(/switch to edit mode/i);
    await user.click(toggleButton);

    const descInput = screen.getByPlaceholderText(
      "Detailed description of the task...",
    );
    await user.clear(descInput);
    await user.type(descInput, "Updated Description");

    // Save task
    await user.click(screen.getByRole("button", { name: /save/i }));

    // Verify API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tasks/task1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            title: "Updated Title",
            description: "Updated Description",
          }),
        }),
      );
    });
  });

  it("deletes task when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();

    // Mock window.confirm to return true
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    // Mock successful task deletion
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockTasksResponse }) // Initial fetch
      .mockResolvedValueOnce({ ok: true }) // Delete task
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTasksResponse, ideas: [] }),
      }); // Refetch after delete

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Open task modal
    await user.click(screen.getByText("Plan project"));

    // Delete task
    await user.click(screen.getByRole("button", { name: /delete task/i }));

    // Verify API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tasks/task1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    vi.unstubAllGlobals();
  });

  it("shows correct task counts in columns", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
    });

    // Check task counts
    expect(screen.getByText("💡 Ideas")).toBeInTheDocument();
    expect(screen.getByText("🎯 Selected")).toBeInTheDocument();

    const oneCountElements = screen.getAllByText("(1)");
    expect(oneCountElements).toHaveLength(2); // Ideas and Selected each have 1 task

    // Other columns should show (0)
    const zeroCountElements = screen.getAllByText("(0)");
    expect(zeroCountElements).toHaveLength(3); // In Progress, Parked, Done
  });
});
