import React, { useState, useEffect, useCallback } from "react";
import { Task, ColumnId, ColumnType } from "./types";
import { COLUMN_DEFINITIONS } from "./constants";
import ColumnComponent from "./components/Column";
import TaskModal from "./components/TaskModal";

interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  displayTasksByColumn: Record<string, Task[]>;
}

const API_BASE_URL = "http://localhost:8000"; // Assuming backend is served from the same origin

const App: React.FC = () => {
  const [tasksByColumn, setTasksByColumn] = useState<Record<string, Task[]>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const calculateDropPosition = useCallback(
    (event: React.DragEvent, targetColumnId: ColumnId) => {
      const targetColumnTasks = (dragState?.displayTasksByColumn[targetColumnId] || [])
        .filter((t) => t.id !== dragState?.draggedTaskId);

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
          const isDropAboveMidpoint = event.clientY < rect.top + rect.height / 2;
          dropIndex = isDropAboveMidpoint ? targetIndex : targetIndex + 1;
        }
      }
      
      return { targetColumnTasks, dropIndex };
    },
    [dragState],
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
      Object.keys(newDisplayTasksByColumn).forEach(columnId => {
        newDisplayTasksByColumn[columnId] = newDisplayTasksByColumn[columnId]
          .filter(t => t.id !== draggedTaskId);
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

  const handleDragEnd = useCallback(() => {
    // Clean up drag state if drag is cancelled
    setDragState(null);
  }, []);

  const handleDragStart = useCallback(
    (event: React.DragEvent, taskId: string, sourceColumnId: ColumnId) => {
      event.dataTransfer.setData("taskId", taskId);
      event.dataTransfer.setData("sourceColumnId", sourceColumnId);
      event.dataTransfer.effectAllowed = "move";
      
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
      
      // Calculate new position and update display state
      const { dropIndex } = calculateDropPosition(event, targetColumnId);
      updateDisplayState(targetColumnId, dropIndex);
    },
    [dragState, calculateDropPosition, updateDisplayState],
  );

  const rollbackDragState = useCallback(() => {
    setDragState(null);
    setError("Failed to move task");
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent, targetColumnId: ColumnId) => {
      event.preventDefault();
      const draggedTaskId = event.dataTransfer.getData("taskId");
      
      if (!draggedTaskId || !dragState) {
        setDragState(null);
        return;
      }

      // Calculate final drop position using server state
      const targetColumnTasks = (tasksByColumn[targetColumnId] || [])
        .filter((t) => t.id !== draggedTaskId);

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
          const isDropAboveMidpoint = event.clientY < rect.top + rect.height / 2;
          dropIndex = isDropAboveMidpoint ? targetIndex : targetIndex + 1;
        }
      }

      // Keep optimistic state during API call
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tasks/${draggedTaskId}/move`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_column_id: targetColumnId,
              new_index: dropIndex,
            }),
          },
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Success: Update server state and clear drag state
        await fetchTasks();
        setDragState(null);
      } catch (e) {
        console.error("Failed to move task:", e);
        rollbackDragState();
        fetchTasks(); // Re-fetch to ensure consistency
      }
    },
    [dragState, tasksByColumn, fetchTasks, rollbackDragState],
  );

  const handleAddTask = useCallback(
    async (columnId: ColumnId) => {
      const newTaskPayload = {
        title: "", // Default empty title
        description: "", // Default empty description
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

        // Re-fetch to get the updated column structure
        fetchTasks();
        setSelectedTask(createdTask);
        setIsModalOpen(true);
      } catch (e) {
        console.error("Failed to add task:", e);
        setError(e instanceof Error ? e.message : "Failed to add task");
      }
    },
    [setSelectedTask, setIsModalOpen],
  );

  const handleSaveTask = useCallback(async (updatedTask: Task) => {
    // The backend expects 'column_id' in snake_case for updates
    const { id, title, description } = updatedTask;
    const payload = {
      title,
      description,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Re-fetch to get the updated task data
      fetchTasks();
      setIsModalOpen(false);
      setSelectedTask(null);
    } catch (e) {
      console.error("Failed to save task:", e);
      setError(e instanceof Error ? e.message : "Failed to save task");
    }
  }, []);

  const handleOpenModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
  }, []);

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Re-fetch tasks as deletion might affect order of other tasks in the same column
        fetchTasks();
        if (selectedTask?.id === taskId) {
          handleCloseModal();
        }
      } catch (e) {
        console.error("Failed to delete task:", e);
        setError(e instanceof Error ? e.message : "Failed to delete task");
      }
    },
    [selectedTask, handleCloseModal, fetchTasks],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-sky-400 text-2xl">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gray-900 text-gray-100">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-sky-400">
          FastAPI Kanban Board
        </h1>
        <p className="text-sm text-gray-400">
          Drag and drop tasks to organize your workflow. Data saved in SQLite
          database.
        </p>
      </header>
      {error && (
        <div className="bg-red-800 text-white p-3 rounded-md mb-4 text-center">
          {error}
        </div>
      )}
      <main 
        className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"
        onDragEnd={handleDragEnd}
      >
        {COLUMN_DEFINITIONS.map((column) => {
          // Use display state during drag, otherwise use server state
          const tasksToRender = dragState?.isDragging 
            ? (dragState.displayTasksByColumn[column.id] || [])
            : (tasksByColumn[column.id] || []);
            
          return (
            <ColumnComponent
              key={column.id}
              column={column}
              tasks={tasksToRender}
              onAddTask={handleAddTask}
              onOpenTaskModal={handleOpenModal}
              onTaskDragStart={handleDragStart}
              onTaskDragOver={handleDragOver}
              onTaskDrop={handleDrop}
              draggedTaskId={dragState?.draggedTaskId}
            />
          );
        })}
      </main>
      {isModalOpen && selectedTask && (
        <TaskModal
          isOpen={isModalOpen}
          task={selectedTask}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default App;
