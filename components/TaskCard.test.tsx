import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import TaskCard from "./TaskCard";
import { Task } from "../types";

const mockTask: Task = {
  id: "test-task-1",
  title: "Test Task",
  description: "Test Description",
  category_id: null,
};

describe("TaskCard", () => {
  it("renders task title", () => {
    const mockOnClick = vi.fn();
    const mockOnDragStart = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        category={null}
        onClick={mockOnClick}
        onDragStart={mockOnDragStart}
      />,
    );

    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    const mockOnDragStart = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        category={null}
        onClick={mockOnClick}
        onDragStart={mockOnDragStart}
      />,
    );

    await user.click(screen.getByText("Test Task"));
    expect(mockOnClick).toHaveBeenCalledWith(mockTask);
  });

  it("applies dragging styles when isDragging is true", () => {
    const mockOnClick = vi.fn();
    const mockOnDragStart = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        category={null}
        onClick={mockOnClick}
        onDragStart={mockOnDragStart}
        isDragging={true}
      />,
    );

    const taskCard = screen.getByText("Test Task").closest("div");
    expect(taskCard).toHaveClass(
      "opacity-50",
      "scale-95",
      "ring-2",
      "ring-sky-400",
    );
  });

  it("does not apply dragging styles when isDragging is false", () => {
    const mockOnClick = vi.fn();
    const mockOnDragStart = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        category={null}
        onClick={mockOnClick}
        onDragStart={mockOnDragStart}
        isDragging={false}
      />,
    );

    const taskCard = screen.getByText("Test Task").closest("div");
    expect(taskCard).not.toHaveClass(
      "opacity-50",
      "scale-95",
      "ring-2",
      "ring-sky-400",
    );
  });

  it("has correct data-task-id attribute", () => {
    const mockOnClick = vi.fn();
    const mockOnDragStart = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        category={null}
        onClick={mockOnClick}
        onDragStart={mockOnDragStart}
      />,
    );

    const taskCard = screen.getByText("Test Task").closest("div");
    expect(taskCard).toHaveAttribute("data-task-id", "test-task-1");
  });

  it("is draggable", () => {
    const mockOnClick = vi.fn();
    const mockOnDragStart = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        category={null}
        onClick={mockOnClick}
        onDragStart={mockOnDragStart}
      />,
    );

    const taskCard = screen.getByText("Test Task").closest("div");
    expect(taskCard).toHaveAttribute("draggable", "true");
  });
});
