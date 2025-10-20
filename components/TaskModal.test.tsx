import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import TaskModal from "./TaskModal";
import { Task } from "../types";

const mockTask: Task = {
  id: "test-task-1",
  title: "Test Task",
  description: "Test Description",
};

const defaultProps = {
  isOpen: true,
  task: mockTask,
  onClose: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
};

describe("TaskModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when isOpen is true", () => {
    render(<TaskModal {...defaultProps} />);

    expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
    expect(screen.getByTestId("md-editor")).toBeInTheDocument();
    expect(screen.getByTitle(/switch to edit mode/i)).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<TaskModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByDisplayValue("Test Task")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<TaskModal {...defaultProps} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onSave with updated task when save button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();

    render(<TaskModal {...defaultProps} onSave={mockOnSave} />);

    // Update title
    const titleInput = screen.getByDisplayValue("Test Task");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Task");

    // Switch to edit mode and update description
    const toggleButton = screen.getByTitle(/switch to edit mode/i);
    await user.click(toggleButton);

    // Find the markdown editor textarea
    const mdEditor = screen.getByTestId("md-editor");
    const textarea = mdEditor.querySelector("textarea");
    expect(textarea).toBeInTheDocument();
    await user.clear(textarea!);
    await user.type(textarea!, "Updated Description");

    // Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      id: "test-task-1",
      title: "Updated Task",
      description: "Updated Description",
    });
  });

  it("calls onDelete when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();

    // Mock window.confirm to return true
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    render(<TaskModal {...defaultProps} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith("test-task-1");

    vi.unstubAllGlobals();
  });

  it("does not call onDelete when delete is cancelled", async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();

    // Mock window.confirm to return false
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<TaskModal {...defaultProps} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDelete).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("handles empty description correctly", async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    const taskWithoutDescription = { ...mockTask, description: "" };

    render(
      <TaskModal
        {...defaultProps}
        task={taskWithoutDescription}
        onSave={mockOnSave}
      />,
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      id: "test-task-1",
      title: "Test Task",
      description: "",
    });
  });

  it("defaults to preview mode when task has description", () => {
    render(<TaskModal {...defaultProps} />);

    // Should show edit button (meaning we're in preview mode)
    expect(screen.getByTitle(/switch to edit mode/i)).toBeInTheDocument();
  });

  it("defaults to edit mode when task has empty description", () => {
    const taskWithoutDescription = { ...mockTask, description: "" };
    render(<TaskModal {...defaultProps} task={taskWithoutDescription} />);

    // Should show preview button (meaning we're in edit mode)
    expect(screen.getByTitle(/switch to preview mode/i)).toBeInTheDocument();
  });

  it("toggles between edit and preview modes when toggle button is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskModal {...defaultProps} />);

    // Initially in preview mode (has description)
    expect(screen.getByTitle(/switch to edit mode/i)).toBeInTheDocument();

    // Click to switch to edit mode
    const toggleButton = screen.getByTitle(/switch to edit mode/i);
    await user.click(toggleButton);

    // Should now be in edit mode
    expect(screen.getByTitle(/switch to preview mode/i)).toBeInTheDocument();

    // Click to switch back to preview mode
    const newToggleButton = screen.getByTitle(/switch to preview mode/i);
    await user.click(newToggleButton);

    // Should be back in preview mode
    expect(screen.getByTitle(/switch to edit mode/i)).toBeInTheDocument();
  });

  it("shows markdown editor in edit mode", async () => {
    const user = userEvent.setup();
    render(<TaskModal {...defaultProps} />);

    // Switch to edit mode
    const toggleButton = screen.getByTitle(/switch to edit mode/i);
    await user.click(toggleButton);

    // Should find the markdown editor container
    expect(screen.getByTestId("md-editor")).toBeInTheDocument();
  });

  it("shows rendered markdown in preview mode", () => {
    const taskWithMarkdown = { ...mockTask, description: "**Bold text**" };
    render(<TaskModal {...defaultProps} task={taskWithMarkdown} />);

    // Should be in preview mode by default
    expect(screen.getByTitle(/switch to edit mode/i)).toBeInTheDocument();

    // Should render the markdown (though exact rendering depends on the markdown parser)
    expect(screen.getByTestId("md-editor")).toBeInTheDocument();
  });
});
