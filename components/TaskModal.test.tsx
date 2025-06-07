import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import TaskModal from "./TaskModal";
import { Task } from "../types";

const mockTask: Task = {
  id: "test-task-1",
  title: "Test Task",
  description: "Test Description"
};

const defaultProps = {
  isOpen: true,
  task: mockTask,
  onClose: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn()
};

describe("TaskModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when isOpen is true", () => {
    render(<TaskModal {...defaultProps} />);

    expect(screen.getByDisplayValue("Test Task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Description")).toBeInTheDocument();
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

    // Update description
    const descriptionInput = screen.getByDisplayValue("Test Description");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated Description");

    // Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      id: "test-task-1",
      title: "Updated Task",
      description: "Updated Description"
    });
  });

  it("calls onDelete when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();

    // Mock window.confirm to return true
    vi.stubGlobal("confirm", vi.fn(() => true));

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
    vi.stubGlobal("confirm", vi.fn(() => false));

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

    render(<TaskModal {...defaultProps} task={taskWithoutDescription} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      id: "test-task-1",
      title: "Test Task",
      description: ""
    });
  });
});