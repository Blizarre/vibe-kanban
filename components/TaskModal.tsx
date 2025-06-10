import React, { useState, useEffect, useCallback, useRef } from "react";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setEditableTitle(task.title);
      setEditableDescription(task.description);
      // Default to preview mode if there's existing text, edit mode if empty
      setIsPreviewMode(task.description ? true : false);
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
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-4xl text-gray-100 transform transition-all duration-300 scale-100 opacity-100">
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
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-300">
              Description
            </label>
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded"
              title={isPreviewMode ? "Switch to edit mode" : "Switch to preview mode"}
            >
              {isPreviewMode ? (
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              ) : (
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
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              )}
            </button>
          </div>
          <div data-color-mode="dark">
            <MDEditor
              value={editableDescription}
              onChange={(val) => setEditableDescription(val || "")}
              preview={isPreviewMode ? "preview" : "edit"}
              hideToolbar
              visibleDragBar={false}
              textareaProps={{
                placeholder: 'Detailed description of the task...',
                style: {
                  fontSize: 14,
                  backgroundColor: 'rgb(55 65 81)',
                  color: 'rgb(243 244 246)',
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
          <button
            onClick={handleDelete}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
          >
            Delete Task
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50"
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
