import React, { useState, useRef, useEffect } from "react";
import { Category } from "../types";
import { CATEGORY_COLORS } from "../constants";

interface CategoryManagementModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onUpdateCategory: (
    categoryId: string,
    updates: Partial<Omit<Category, "id">>,
  ) => Promise<boolean>;
  onDeleteCategory: (categoryId: string) => Promise<boolean>;
  onCreateCategory: (name: string, color: string) => Promise<Category | null>;
}

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  categories,
  onClose,
  onUpdateCategory,
  onDeleteCategory,
  onCreateCategory,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(
    CATEGORY_COLORS[0].class,
  );
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [isCreating]);

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setColorPickerId(null);
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await onUpdateCategory(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleColorChange = async (categoryId: string, color: string) => {
    await onUpdateCategory(categoryId, { color });
    setColorPickerId(null);
  };

  const handleDelete = async (category: Category) => {
    if (
      confirm(
        `Are you sure you want to delete "${category.name}"? Tasks with this category will become uncategorized.`,
      )
    ) {
      await onDeleteCategory(category.id);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const created = await onCreateCategory(
      newCategoryName.trim(),
      newCategoryColor,
    );
    if (created) {
      setNewCategoryName("");
      setNewCategoryColor(CATEGORY_COLORS[0].class);
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    } else if (e.key === "Escape") {
      if (editingId) handleCancelEdit();
      if (isCreating) setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="categoryModalTitle"
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2
            id="categoryModalTitle"
            className="text-xl font-semibold text-sky-400"
          >
            Manage Categories
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

        <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
          {categories.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              No categories yet. Create one below!
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 p-2 bg-gray-700 rounded-md"
              >
                {/* Color picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setColorPickerId(
                        colorPickerId === category.id ? null : category.id,
                      )
                    }
                    className={`w-6 h-6 rounded-full ${category.color} hover:ring-2 hover:ring-white hover:ring-offset-1 hover:ring-offset-gray-700`}
                    title="Change color"
                  />
                  {colorPickerId === category.id && (
                    <div className="absolute left-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-md p-2 shadow-lg">
                      <div className="flex flex-wrap gap-1 w-32">
                        {CATEGORY_COLORS.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() =>
                              handleColorChange(category.id, color.class)
                            }
                            className={`w-6 h-6 rounded-full ${color.class} ${
                              category.color === color.class
                                ? "ring-2 ring-white ring-offset-1 ring-offset-gray-800"
                                : ""
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Name (editable) */}
                {editingId === category.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                    onBlur={handleSaveEdit}
                    className="flex-1 p-1 bg-gray-600 border border-gray-500 rounded text-sm focus:ring-sky-500 focus:border-sky-500 focus:outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 text-gray-100 cursor-pointer hover:text-sky-400"
                    onClick={() => handleStartEdit(category)}
                    title="Click to edit"
                  >
                    {category.name}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-1">
                  {editingId === category.id ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="p-1 text-green-400 hover:text-green-300"
                        title="Save"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-400 hover:text-gray-300"
                        title="Cancel"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(category)}
                        className="p-1 text-gray-400 hover:text-gray-300"
                        title="Edit name"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete category"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create new category */}
        {isCreating ? (
          <div className="space-y-3 p-3 bg-gray-700 rounded-md">
            <input
              ref={newInputRef}
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleCreateCategory)}
              placeholder="Category name..."
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500 focus:outline-none focus:ring-2"
            />
            <div className="flex flex-wrap gap-1">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setNewCategoryColor(color.class)}
                  className={`w-6 h-6 rounded-full ${color.class} ${
                    newCategoryColor === color.class
                      ? "ring-2 ring-white ring-offset-1 ring-offset-gray-700"
                      : ""
                  }`}
                  title={color.name}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewCategoryName("");
                }}
                className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="w-full py-2 border-2 border-dashed border-gray-600 rounded-md text-gray-400 hover:text-gray-200 hover:border-gray-500 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Category
          </button>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementModal;
