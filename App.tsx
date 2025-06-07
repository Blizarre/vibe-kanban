import React, { useState, useEffect, useCallback } from "react";
import { Task, ColumnId, ColumnType } from "./types";
import { COLUMN_DEFINITIONS } from "./constants";
import ColumnComponent from "./components/Column";
import TaskModal from "./components/TaskModal";

const API_BASE_URL = "http://localhost:8000"; // Assuming backend is served from the same origin

const App: React.FC = () => {
  const [tasksByColumn, setTasksByColumn] = useState<Record<string, Task[]>>({});
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

  const handleDragStart = useCallback(
    (event: React.DragEvent, taskId: string, sourceColumnId: ColumnId) => {
      event.dataTransfer.setData("taskId", taskId);
      event.dataTransfer.setData("sourceColumnId", sourceColumnId);
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent, targetColumnId: ColumnId) => {
      event.preventDefault();
      const draggedTaskId = event.dataTransfer.getData("taskId");
      console.log("dropped", draggedTaskId);

      if (!draggedTaskId) return;

      // Find the task in any column
      let taskToMove: Task | null = null;
      for (const columnTasks of Object.values(tasksByColumn)) {
        taskToMove = columnTasks.find((t) => t.id === draggedTaskId) || null;
        if (taskToMove) break;
      }
      
      if (!taskToMove) {
        console.log("Could not find task", draggedTaskId, "in", tasksByColumn);
        return;
      }

      let targetColumnTasks = (tasksByColumn[targetColumnId] || [])
        .filter((t) => t.id !== draggedTaskId);

      const dropTargetElement = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-task-id]") as HTMLElement | null;
      console.log("dropTargetElement: " + dropTargetElement);

      var dropIndex = 0;
      if (dropTargetElement) {
        const dropTargetTaskId = dropTargetElement.dataset.taskId;
        dropIndex = targetColumnTasks.findIndex(
          (t) => t.id === dropTargetTaskId,
        );

        targetColumnTasks.map((task) => console.log(task));
        console.log(
          "Dropped near a target element",
          dropTargetTaskId,
          "at index",
          dropIndex,
        );
        if (dropIndex !== -1) {
          const rect = dropTargetElement.getBoundingClientRect();
          const isDropAboveMidpoint =
            event.clientY < rect.top + rect.height / 2;
          console.log("isDropAboveMidpoint", isDropAboveMidpoint);
          if (isDropAboveMidpoint) {
            dropIndex += 1;
          }
        }
      }
      console.log("new index", dropIndex);

      // Remove reference to sourceColumnIdOfMovedTask as it's no longer needed

      // API Call
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
        // Re-fetch to ensure data consistency after backend reordering
        fetchTasks();
      } catch (e) {
        console.error("Failed to move task:", e);
        setError(e instanceof Error ? e.message : "Failed to move task");
        fetchTasks(); // Re-fetch to revert to server state on error
      }
    },
    [fetchTasks, tasksByColumn],
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
      <main className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMN_DEFINITIONS.map((column) => (
          <ColumnComponent
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            onAddTask={handleAddTask}
            onOpenTaskModal={handleOpenModal}
            onTaskDragStart={handleDragStart}
            onTaskDragOver={handleDragOver}
            onTaskDrop={handleDrop}
          />
        ))}
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
