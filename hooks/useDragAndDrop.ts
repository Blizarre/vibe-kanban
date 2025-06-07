import { useState, useCallback, useRef } from "react";
import { Task, ColumnId } from "../types";

interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  displayTasksByColumn: Record<string, Task[]>;
}

interface DragOverState {
  lastUpdateTime: number;
  lastColumnId: string | null;
  lastDropIndex: number | null;
}

export interface UseDragAndDropResult {
  dragState: DragState | null;
  handleDragStart: (
    event: React.DragEvent,
    taskId: string,
    sourceColumnId: ColumnId,
  ) => void;
  handleDragOver: (event: React.DragEvent, targetColumnId: ColumnId) => void;
  handleDragEnd: () => void;
  handleDrop: (
    event: React.DragEvent,
    targetColumnId: ColumnId,
    onMoveTask: (
      taskId: string,
      newColumnId: ColumnId,
      newIndex: number,
    ) => Promise<boolean>,
  ) => Promise<void>;
}

export const useDragAndDrop = (
  tasksByColumn: Record<string, Task[]>,
): UseDragAndDropResult => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragOverStateRef = useRef<DragOverState>({
    lastUpdateTime: 0,
    lastColumnId: null,
    lastDropIndex: null,
  });

  const calculateDropPosition = useCallback(
    (event: React.DragEvent, targetColumnId: ColumnId) => {
      // Use the original server state for position calculation to avoid inconsistencies
      const targetColumnTasks = (tasksByColumn[targetColumnId] || []).filter(
        (t) => t.id !== dragState?.draggedTaskId,
      );

      // Get all task elements in the target column, excluding the dragged task
      const columnElement = document.querySelector(
        `[data-column-id="${targetColumnId}"]`,
      );
      if (!columnElement) {
        return { targetColumnTasks, dropIndex: targetColumnTasks.length };
      }

      const taskElements = Array.from(
        columnElement.querySelectorAll("[data-task-id]"),
      ).filter((el) => {
        const taskId = (el as HTMLElement).dataset.taskId;
        return taskId !== dragState?.draggedTaskId;
      }) as HTMLElement[];

      let dropIndex = targetColumnTasks.length;

      // Find the task element that the mouse is over based on Y position only
      for (let i = 0; i < taskElements.length; i++) {
        const element = taskElements[i];
        const rect = element.getBoundingClientRect();

        // Only consider Y position to avoid horizontal movement issues
        if (event.clientY < rect.bottom) {
          const isDropAboveMidpoint =
            event.clientY < rect.top + rect.height / 2;
          dropIndex = isDropAboveMidpoint ? i : i + 1;
          break;
        }
      }

      return { targetColumnTasks, dropIndex };
    },
    [dragState, tasksByColumn],
  );

  const updateDisplayState = useCallback(
    (targetColumnId: ColumnId, dropIndex: number) => {
      if (!dragState) return;

      const draggedTaskId = dragState.draggedTaskId;
      if (!draggedTaskId) return;

      // Find the dragged task
      let draggedTask: Task | null = null;
      for (const columnTasks of Object.values(dragState.displayTasksByColumn)) {
        draggedTask = columnTasks.find((t) => t.id === draggedTaskId) || null;
        if (draggedTask) break;
      }

      if (!draggedTask) return;

      // Create new display state
      const newDisplayTasksByColumn = { ...dragState.displayTasksByColumn };

      // Remove task from all columns
      Object.keys(newDisplayTasksByColumn).forEach((columnId) => {
        newDisplayTasksByColumn[columnId] = newDisplayTasksByColumn[
          columnId
        ].filter((t) => t.id !== draggedTaskId);
      });

      // Add task to target column at specified index
      if (!newDisplayTasksByColumn[targetColumnId]) {
        newDisplayTasksByColumn[targetColumnId] = [];
      }

      const targetTasks = [...newDisplayTasksByColumn[targetColumnId]];
      targetTasks.splice(dropIndex, 0, draggedTask);
      newDisplayTasksByColumn[targetColumnId] = targetTasks;

      setDragState({
        ...dragState,
        displayTasksByColumn: newDisplayTasksByColumn,
      });
    },
    [dragState],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, taskId: string, sourceColumnId: ColumnId) => {
      event.dataTransfer.setData("taskId", taskId);
      event.dataTransfer.setData("sourceColumnId", sourceColumnId);
      event.dataTransfer.effectAllowed = "move";

      // Reset drag over state tracking
      dragOverStateRef.current = {
        lastUpdateTime: 0,
        lastColumnId: null,
        lastDropIndex: null,
      };

      // Initialize drag state with current tasks
      setDragState({
        isDragging: true,
        draggedTaskId: taskId,
        displayTasksByColumn: { ...tasksByColumn },
      });
    },
    [tasksByColumn],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent, targetColumnId: ColumnId) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      if (!dragState?.isDragging) return;

      const now = Date.now();
      const { lastUpdateTime, lastColumnId, lastDropIndex } =
        dragOverStateRef.current;

      // Throttle updates to every 16ms (60fps) to prevent excessive re-renders
      const THROTTLE_MS = 16;
      if (now - lastUpdateTime < THROTTLE_MS) {
        return;
      }

      // Calculate new position
      const { dropIndex } = calculateDropPosition(event, targetColumnId);

      // Only update if position actually changed
      if (targetColumnId === lastColumnId && dropIndex === lastDropIndex) {
        return;
      }

      // Update tracking state
      dragOverStateRef.current = {
        lastUpdateTime: now,
        lastColumnId: targetColumnId,
        lastDropIndex: dropIndex,
      };

      // Update display state
      updateDisplayState(targetColumnId, dropIndex);
    },
    [dragState, calculateDropPosition, updateDisplayState],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  const handleDrop = useCallback(
    async (
      event: React.DragEvent,
      targetColumnId: ColumnId,
      onMoveTask: (
        taskId: string,
        newColumnId: ColumnId,
        newIndex: number,
      ) => Promise<boolean>,
    ) => {
      event.preventDefault();
      const draggedTaskId = event.dataTransfer.getData("taskId");

      if (!draggedTaskId || !dragState) {
        setDragState(null);
        return;
      }

      // Calculate final drop position using server state
      const targetColumnTasks = (tasksByColumn[targetColumnId] || []).filter(
        (t) => t.id !== draggedTaskId,
      );

      const dropTargetElement = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-task-id]") as HTMLElement | null;

      let dropIndex = targetColumnTasks.length;
      if (dropTargetElement) {
        const dropTargetTaskId = dropTargetElement.dataset.taskId;
        const targetIndex = targetColumnTasks.findIndex(
          (t) => t.id === dropTargetTaskId,
        );

        if (targetIndex !== -1) {
          const rect = dropTargetElement.getBoundingClientRect();
          const isDropAboveMidpoint =
            event.clientY < rect.top + rect.height / 2;
          dropIndex = isDropAboveMidpoint ? targetIndex : targetIndex + 1;
        }
      }

      // Clear drag state immediately - optimistic update will handle the visual feedback
      setDragState(null);

      // Perform the move operation with optimistic updates
      const success = await onMoveTask(
        draggedTaskId,
        targetColumnId,
        dropIndex,
      );

      if (!success) {
        // If move failed, the error will be shown by the API hook
        // and the optimistic update will be rolled back automatically
      }
    },
    [dragState, tasksByColumn],
  );

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
};
