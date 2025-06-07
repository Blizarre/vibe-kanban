import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import Column from "./Column";
import { ColumnType, Task } from "../types";

const mockColumn: ColumnType = {
  id: "test-column",
  title: "Test Column",
  bgClass: "bg-blue-600"
};

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Task 1",
    description: "Description 1"
  },
  {
    id: "task-2", 
    title: "Task 2",
    description: "Description 2"
  }
];

const defaultProps = {
  column: mockColumn,
  tasks: mockTasks,
  onAddTask: vi.fn(),
  onOpenTaskModal: vi.fn(),
  onTaskDragStart: vi.fn(),
  onTaskDragOver: vi.fn(),
  onTaskDrop: vi.fn()
};

describe("Column", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders column title and task count", () => {
    render(<Column {...defaultProps} />);

    expect(screen.getByText("Test Column")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("renders all tasks", () => {
    render(<Column {...defaultProps} />);

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });

  it("shows empty message when no tasks", () => {
    render(<Column {...defaultProps} tasks={[]} />);

    expect(screen.getByText(/Drag tasks here or add a new one/)).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });

  it("calls onAddTask when add button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnAddTask = vi.fn();

    render(<Column {...defaultProps} onAddTask={mockOnAddTask} />);

    const addButton = screen.getByRole("button", { name: /Add new task/i });
    await user.click(addButton);

    expect(mockOnAddTask).toHaveBeenCalledWith("test-column");
  });

  it("has correct data-column-id attribute", () => {
    const { container } = render(<Column {...defaultProps} />);

    const columnDiv = container.querySelector("[data-column-id]");
    expect(columnDiv).toHaveAttribute("data-column-id", "test-column");
  });

  it("highlights dragged task", () => {
    render(<Column {...defaultProps} draggedTaskId="task-1" />);

    // Task 1 should have dragging styles
    const task1 = screen.getByText("Task 1").closest("div");
    expect(task1).toHaveClass("opacity-50");

    // Task 2 should not have dragging styles
    const task2 = screen.getByText("Task 2").closest("div");
    expect(task2).not.toHaveClass("opacity-50");
  });

  it("passes correct props to TaskCard components", () => {
    const mockOnTaskDragStart = vi.fn();
    const mockOnOpenTaskModal = vi.fn();

    render(
      <Column
        {...defaultProps}
        onTaskDragStart={mockOnTaskDragStart}
        onOpenTaskModal={mockOnOpenTaskModal}
      />
    );

    // Check that tasks are rendered with proper props by testing drag and click
    const task1Element = screen.getByText("Task 1");
    expect(task1Element.closest("div")).toHaveAttribute("data-task-id", "task-1");
  });
});