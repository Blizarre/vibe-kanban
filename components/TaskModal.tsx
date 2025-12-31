import React, { useState, useEffect, useCallback, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { Task, Category } from "../types";
import CategorySelect from "./CategorySelect";
import {
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import {
  modalOverlay,
  modalCloseButton,
  buttonPrimary,
  buttonSecondary,
  buttonDanger,
} from "../styles";

interface TaskModalProps {
  isOpen: boolean;
  task: Task | null;
  categories: Category[];
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  onCreateCategory: (name: string, color: string) => Promise<Category | null>;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  task,
  categories,
  onClose,
  onSave,
  onDelete,
  onCreateCategory,
}) => {
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [editableCategoryId, setEditableCategoryId] = useState<string | null>(
    null,
  );
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
    setEditableCategoryId(task.category_id);
    // Default to preview mode if there's existing text, edit mode if empty
    setIsPreviewMode(task.description ? true : false);
  } else if (!task && currentTaskId) {
    setCurrentTaskId(null);
    setEditableTitle("");
    setEditableDescription("");
    setEditableCategoryId(null);
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
        const newHeight = Math.max(availableHeight - 10, 250);
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
        category_id: editableCategoryId,
      });
    }
  }, [task, editableTitle, editableDescription, editableCategoryId, onSave]);

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
      className={`${modalOverlay} transition-opacity duration-300`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="taskModalTitle"
    >
      <div className="bg-gray-800 p-4 rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col text-gray-100 transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center mb-4">
          <h2
            id="taskModalTitle"
            className="text-2xl font-semibold text-sky-400"
          >
            Edit Task
          </h2>
          <button
            onClick={onClose}
            className={modalCloseButton}
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label
              htmlFor="taskTitle"
              className="block text-sm font-medium text-gray-300"
            >
              Title
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
                <PencilSquareIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Category
          </label>
          <CategorySelect
            categories={categories}
            selectedCategoryId={editableCategoryId}
            onSelect={setEditableCategoryId}
            onCreateCategory={onCreateCategory}
          />
        </div>

        <div className="mb-2 flex-1 flex flex-col">
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
              textareaProps={{
                spellCheck: true,
                autoCorrect: "on",
                autoCapitalize: "sentences",
              }}
            />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleDelete}
            className={`${buttonDanger} p-3`}
            title="Delete Task"
            aria-label="Delete Task"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className={`${buttonSecondary} font-medium py-2 px-4`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`${buttonPrimary} p-3`}
            disabled={!editableTitle.trim()}
            title="Save Changes"
            aria-label="Save Changes"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
