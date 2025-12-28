import React, { useState, useCallback, useMemo } from "react";
import { Task, ColumnId } from "./types";
import { COLUMN_DEFINITIONS } from "./constants";
import ColumnComponent from "./components/Column";
import TaskModal from "./components/TaskModal";
import CategoryFilterDropdown from "./components/CategoryFilterDropdown";
import CategoryManagementModal from "./components/CategoryManagementModal";
import { useTasks } from "./hooks/useTasks";
import { useCategories } from "./hooks/useCategories";
import { useDragAndDrop } from "./hooks/useDragAndDrop";

const App: React.FC = () => {
  // Use custom hooks for data and drag/drop logic
  const {
    tasksByColumn,
    isLoading,
    error,
    addTask,
    updateTask,
    deleteTask,
    emptyColumn,
    moveTask,
  } = useTasks();

  const {
    categories,
    categoriesById,
    isLoading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragAndDrop(tasksByColumn);

  // Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Category filter state
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Filter tasks by category
  const filteredTasksByColumn = useMemo(() => {
    if (categoryFilter === null) {
      // "All" - no filtering
      return tasksByColumn;
    }

    const result: Record<string, Task[]> = {};
    for (const [columnId, tasks] of Object.entries(tasksByColumn)) {
      if (categoryFilter === "none") {
        result[columnId] = tasks.filter((t) => !t.category_id);
      } else {
        result[columnId] = tasks.filter(
          (t) => t.category_id === categoryFilter,
        );
      }
    }
    return result;
  }, [tasksByColumn, categoryFilter]);

  // Reset filter if the filtered category is deleted
  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const success = await deleteCategory(categoryId);
      if (success && categoryFilter === categoryId) {
        setCategoryFilter(null);
      }
      return success;
    },
    [deleteCategory, categoryFilter],
  );

  // Event handlers using the custom hooks
  const handleAddTask = useCallback(
    async (columnId: ColumnId) => {
      const createdTask = await addTask(columnId);
      if (createdTask) {
        setSelectedTask(createdTask);
        setIsModalOpen(true);
      }
    },
    [addTask],
  );

  const handleSaveTask = useCallback(
    async (updatedTask: Task) => {
      const success = await updateTask(updatedTask);
      if (success) {
        setIsModalOpen(false);
        setSelectedTask(null);
      }
    },
    [updateTask],
  );

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
      const success = await deleteTask(taskId);
      if (success && selectedTask?.id === taskId) {
        handleCloseModal();
      }
    },
    [deleteTask, selectedTask, handleCloseModal],
  );

  const handleEmptyColumn = useCallback(
    async (columnId: ColumnId) => {
      await emptyColumn(columnId);
    },
    [emptyColumn],
  );

  // Drag and drop handlers
  const handleTaskDrop = useCallback(
    (event: React.DragEvent, targetColumnId: ColumnId) => {
      handleDrop(event, targetColumnId, moveTask);
    },
    [handleDrop, moveTask],
  );

  if (isLoading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-sky-400 text-2xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gray-900 text-gray-100">
      <header className="mb-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-sky-400">🚀 KanFlow</h1>
          <p className="text-sm text-gray-400">
            Vibe-driven task management that just works
          </p>
        </div>
        <div className="flex justify-center items-center gap-3 mt-4">
          <CategoryFilterDropdown
            categories={categories}
            selectedFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
          />
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            title="Manage Categories"
            aria-label="Manage Categories"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h.008v.008H6V6z"
              />
            </svg>
          </button>
        </div>
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
        {COLUMN_DEFINITIONS.map((column) => (
          <ColumnComponent
            key={column.id}
            column={column}
            tasks={filteredTasksByColumn[column.id] || []}
            categoriesById={categoriesById}
            onAddTask={handleAddTask}
            onOpenTaskModal={handleOpenModal}
            onEmptyColumn={handleEmptyColumn}
            onTaskDragStart={handleDragStart}
            onTaskDragOver={handleDragOver}
            onTaskDrop={handleTaskDrop}
            draggedTaskId={dragState?.draggedTaskId}
            dragOverColumn={dragState?.dragOverColumn}
            dragOverIndex={dragState?.dragOverIndex}
          />
        ))}
      </main>
      {isModalOpen && selectedTask && (
        <TaskModal
          isOpen={isModalOpen}
          task={selectedTask}
          categories={categories}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onCreateCategory={createCategory}
        />
      )}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        categories={categories}
        onClose={() => setIsCategoryModalOpen(false)}
        onUpdateCategory={updateCategory}
        onDeleteCategory={handleDeleteCategory}
        onCreateCategory={createCategory}
      />
    </div>
  );
};

export default App;
