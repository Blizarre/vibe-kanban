import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragAndDrop } from "./useDragAndDrop";

const mockTasksByColumn = {
  ideas: [
    { id: "task1", title: "Task 1", description: "Desc 1" },
    { id: "task2", title: "Task 2", description: "Desc 2" },
  ],
  selected: [
    { id: "task3", title: "Task 3", description: "Desc 3" },
  ],
};

// Mock DOM elements for drag position calculation
const mockQuerySelector = vi.fn();
const mockGetBoundingClientRect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock document.querySelector
  Object.defineProperty(document, 'querySelector', {
    value: mockQuerySelector,
    writable: true,
  });

  // Setup default mock return values
  mockQuerySelector.mockReturnValue({
    querySelectorAll: vi.fn().mockReturnValue([]),
  });
});

describe("useDragAndDrop", () => {
  it("initializes with null drag state", () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));

    expect(result.current.dragState).toBe(null);
  });

  it("starts drag operation", () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));

    const mockEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null,
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(mockEvent, "task1", "ideas");
    });

    expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith("taskId", "task1");
    expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith("sourceColumnId", "ideas");
    expect(mockEvent.dataTransfer.effectAllowed).toBe("move");

    expect(result.current.dragState).toEqual({
      isDragging: true,
      draggedTaskId: "task1",
      displayTasksByColumn: mockTasksByColumn,
    });
  });

  it("ends drag operation", () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));

    // Start drag first
    const mockEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null,
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(mockEvent, "task1", "ideas");
    });

    expect(result.current.dragState).not.toBe(null);

    // End drag
    act(() => {
      result.current.handleDragEnd();
    });

    expect(result.current.dragState).toBe(null);
  });

  it("handles drag over with throttling", () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));

    // Start drag first
    const startEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null,
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(startEvent, "task1", "ideas");
    });

    // Mock drag over event
    const dragOverEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: null,
      },
      clientX: 100,
      clientY: 50,
    } as unknown as React.DragEvent;

    // Mock column element
    const mockColumnElement = {
      querySelectorAll: vi.fn().mockReturnValue([]),
    };
    mockQuerySelector.mockReturnValue(mockColumnElement);

    act(() => {
      result.current.handleDragOver(dragOverEvent, "selected");
    });

    expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    expect(dragOverEvent.dataTransfer.dropEffect).toBe("move");
  });

  it("handles drop operation", async () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));
    const mockOnMoveTask = vi.fn().mockResolvedValue(true);

    // Start drag first
    const startEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null,
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(startEvent, "task1", "ideas");
    });

    // Mock drop event
    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn((key) => {
          if (key === "taskId") return "task1";
          if (key === "sourceColumnId") return "ideas";
          return "";
        }),
      },
      clientX: 100,
      clientY: 50,
    } as unknown as React.DragEvent;

    // Mock document.elementFromPoint
    Object.defineProperty(document, 'elementFromPoint', {
      value: vi.fn().mockReturnValue(null),
      writable: true,
    });

    await act(async () => {
      await result.current.handleDrop(dropEvent, "selected", mockOnMoveTask);
    });

    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(mockOnMoveTask).toHaveBeenCalledWith("task1", "selected", 1); // End of selected column
    expect(result.current.dragState).toBe(null);
  });

  it("handles drop with target element position calculation", async () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));
    const mockOnMoveTask = vi.fn().mockResolvedValue(true);

    // Start drag first
    const startEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null,
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(startEvent, "task1", "ideas");
    });

    // Mock target element
    const mockTargetElement = {
      dataset: { taskId: "task3" },
      closest: vi.fn().mockReturnThis(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: 40,
        height: 20,
      }),
    };

    // Mock drop event
    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn((key) => {
          if (key === "taskId") return "task1";
          if (key === "sourceColumnId") return "ideas";
          return "";
        }),
      },
      clientX: 100,
      clientY: 45, // Below midpoint (top: 40, height: 20, midpoint: 50)
    } as unknown as React.DragEvent;

    // Mock document.elementFromPoint to return target element
    Object.defineProperty(document, 'elementFromPoint', {
      value: vi.fn().mockReturnValue(mockTargetElement),
      writable: true,
    });

    await act(async () => {
      await result.current.handleDrop(dropEvent, "selected", mockOnMoveTask);
    });

    expect(mockOnMoveTask).toHaveBeenCalledWith("task1", "selected", 1); // After task3
  });

  it("doesn't update display state when not dragging", () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));

    const dragOverEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: null,
      },
      clientX: 100,
      clientY: 50,
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragOver(dragOverEvent, "selected");
    });

    expect(result.current.dragState).toBe(null);
  });

  it("handles failed move operation", async () => {
    const { result } = renderHook(() => useDragAndDrop(mockTasksByColumn));
    const mockOnMoveTask = vi.fn().mockResolvedValue(false);

    // Start drag first
    const startEvent = {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: null,
      },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(startEvent, "task1", "ideas");
    });

    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn((key) => {
          if (key === "taskId") return "task1";
          return "";
        }),
      },
      clientX: 100,
      clientY: 50,
    } as unknown as React.DragEvent;

    await act(async () => {
      await result.current.handleDrop(dropEvent, "selected", mockOnMoveTask);
    });

    expect(mockOnMoveTask).toHaveBeenCalled();
    expect(result.current.dragState).toBe(null); // Should still clear drag state
  });
});