import React, { useState, useEffect, useCallback, useRef } from "react";
import { Task } from "../types";

interface TaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setEditableTitle(task.title);
      setEditableDescription(task.description);
    }
  }, [task]);

  useEffect(() => {
    if (isOpen && task && titleInputRef.current) {
      const timerId = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timerId);
    }
  }, [isOpen, task]);

  const handleSave = useCallback(() => {
    if (task) {
      onSave({
        ...task,
        title: editableTitle.trim() || "Untitled Task",
        description: editableDescription,
      });
    }
  }, [task, editableTitle, editableDescription, onSave]);

  const handleDelete = useCallback(() => {
    if (task) {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
        onDelete(task.id);
      }
    }
  }, [task, onDelete]);

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (editableTitle.trim()) {
        event.preventDefault();
        handleSave();
      }
    }
  };

  if (!isOpen || !task) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="taskModalTitle"
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg text-gray-100 transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center mb-4">
          <h2
            id="taskModalTitle"
            className="text-2xl font-semibold text-sky-400"
          >
            Edit Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="taskTitle"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Title
          </label>
          <input
            id="taskTitle"
            ref={titleInputRef}
            type="text"
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"
            placeholder="Task title"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="taskDescription"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="taskDescription"
            value={editableDescription}
            onChange={(e) => setEditableDescription(e.target.value)}
            rows={5}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"
            placeholder="Detailed description of the task..."
          />
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          >
            Delete Task
          </button>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50"
              disabled={!editableTitle.trim()}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
