import React, { useState, useRef, useEffect } from "react";
import { Category } from "../types";
import { CATEGORY_COLORS } from "../constants";
import ColorPicker from "./ColorPicker";
import {
  XMarkIcon,
  PlusIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { modalOverlay, modalCloseButton, buttonSecondary } from "../styles";

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
      className={modalOverlay}
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
            className={modalCloseButton}
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
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
                    <div className="absolute left-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-md p-2 shadow-lg w-36">
                      <ColorPicker
                        selectedColor={category.color}
                        onColorSelect={(color) =>
                          handleColorChange(category.id, color)
                        }
                      />
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
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-400 hover:text-gray-300"
                        title="Cancel"
                      >
                        <XMarkIcon className="w-4 h-4" />
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
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete category"
                      >
                        <TrashIcon className="w-4 h-4" />
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
            <ColorPicker
              selectedColor={newCategoryColor}
              onColorSelect={setNewCategoryColor}
              ringOffsetColor="ring-offset-gray-700"
            />
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
            <PlusIcon className="w-5 h-5" />
            Add New Category
          </button>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={`${buttonSecondary} px-4 py-2`}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementModal;
