import React, { useState, useEffect, useCallback, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
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
  const [editorHeight, setEditorHeight] = useState(400);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when task changes
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  if (task && task.id !== currentTaskId) {
    setCurrentTaskId(task.id);
    setEditableTitle(task.title);
    setEditableDescription(task.description);
    // Default to preview mode if there's existing text, edit mode if empty
    setIsPreviewMode(task.description ? true : false);
  } else if (!task && currentTaskId) {
    setCurrentTaskId(null);
    setEditableTitle("");
    setEditableDescription("");
    setIsPreviewMode(false);
  }

  useEffect(() => {
    if (isOpen && task && titleInputRef.current) {
      const timerId = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timerId);
    }
  }, [isOpen, task]);

  useEffect(() => {
    const updateEditorHeight = () => {
      if (editorContainerRef.current) {
        const rect = editorContainerRef.current.getBoundingClientRect();
        const availableHeight = rect.height;
        const newHeight = Math.max(availableHeight - 20, 250);
        setEditorHeight(newHeight);
      }
    };

    if (isOpen && editorContainerRef.current) {
      // Use ResizeObserver for more reliable container size tracking
      const resizeObserver = new ResizeObserver(() => {
        updateEditorHeight();
      });

      resizeObserver.observe(editorContainerRef.current);

      // Initial height calculation with a small delay to ensure DOM is ready
      const timerId = setTimeout(updateEditorHeight, 150);

      return () => {
        resizeObserver.disconnect();
        clearTimeout(timerId);
      };
    }
  }, [isOpen]);

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
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col text-gray-100 transform transition-all duration-300 scale-100 opacity-100">
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

        <div className="mb-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-300">
              Description
            </label>
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded"
              title={
                isPreviewMode ? "Switch to edit mode" : "Switch to preview mode"
              }
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
          <div
            ref={editorContainerRef}
            data-color-mode="dark"
            className="flex-1 flex flex-col"
          >
            <MDEditor
              value={editableDescription}
              onChange={(val) => setEditableDescription(val || "")}
              preview={isPreviewMode ? "preview" : "edit"}
              visibleDragbar={false}
              hideToolbar
              data-color-mode="dark"
              data-testid="md-editor"
              height={editorHeight}
            />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
            title="Delete Task"
            aria-label="Delete Task"
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
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium py-2 px-4 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50"
            disabled={!editableTitle.trim()}
            title="Save Changes"
            aria-label="Save Changes"
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
