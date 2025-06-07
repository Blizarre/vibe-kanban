import { useState, useCallback } from "react";
import { ColumnId } from "../types";

interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  dragOverColumn: ColumnId | null;
  dragOverIndex: number | null;
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
  tasksByColumn: Record<string, any[]>,
): UseDragAndDropResult => {
  const [dragState, setDragState] = useState<DragState | null>(null);

  const calculateDropIndex = useCallback(
    (event: React.DragEvent, targetColumnId: ColumnId): number => {
      const columnElement = document.querySelector(
        `[data-column-id="${targetColumnId}"]`,
      );
      
      if (!columnElement) {
        return (tasksByColumn[targetColumnId] || []).length;
      }

      // Get the task container (the scrollable area) - fallback to columnElement for tests
      const taskContainer = columnElement.querySelector ? 
        columnElement.querySelector('.column-tasks') : 
        columnElement;
      
      if (!taskContainer) {
        return (tasksByColumn[targetColumnId] || []).length;
      }

      const taskElements = Array.from(
        (taskContainer.querySelectorAll || (() => [])).call(taskContainer, "[data-task-id]"),
      ).filter((el) => {
        const taskId = (el as HTMLElement).dataset?.taskId;
        return taskId !== dragState?.draggedTaskId;
      }) as HTMLElement[];

      // If no tasks, drop at beginning
      if (taskElements.length === 0) {
        return 0;
      }

      // Find drop position based on Y coordinate
      for (let i = 0; i < taskElements.length; i++) {
        const rect = taskElements[i].getBoundingClientRect();
        // If mouse is in the top half of this task, drop before it
        if (event.clientY < rect.top + rect.height / 2) {
          return i;
        }
      }
      
      // If we get here, mouse is below all tasks - drop at the end
      return taskElements.length;
    },
    [dragState?.draggedTaskId, tasksByColumn],
  );


  const handleDragStart = useCallback(
    (event: React.DragEvent, taskId: string, sourceColumnId: ColumnId) => {
      event.dataTransfer.setData("taskId", taskId);
      event.dataTransfer.setData("sourceColumnId", sourceColumnId);
      event.dataTransfer.effectAllowed = "move";

      setDragState({
        isDragging: true,
        draggedTaskId: taskId,
        dragOverColumn: null,
        dragOverIndex: null,
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent, targetColumnId: ColumnId) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      
      if (!dragState?.isDragging) return;
      
      const dropIndex = calculateDropIndex(event, targetColumnId);
      
      // Update drag over state for visual feedback
      setDragState(prevState => prevState ? {
        ...prevState,
        dragOverColumn: targetColumnId,
        dragOverIndex: dropIndex,
      } : null);
    },
    [dragState, calculateDropIndex],
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

      const dropIndex = calculateDropIndex(event, targetColumnId);
      
      // Clear drag state and perform move
      setDragState(null);
      await onMoveTask(draggedTaskId, targetColumnId, dropIndex);
    },
    [dragState, calculateDropIndex],
  );

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
};
