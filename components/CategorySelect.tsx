import React, { useState, useRef, useEffect, useCallback } from "react";
import { Category } from "../types";
import { CATEGORY_COLORS } from "../constants";
import { useClickOutside } from "../hooks/useClickOutside";
import ColorPicker from "./ColorPicker";

interface CategorySelectProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string) => Promise<Category | null>;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  selectedCategoryId,
  onSelect,
  onCreateCategory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0].class);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  useClickOutside(
    dropdownRef,
    useCallback(() => {
      setIsOpen(false);
      setIsCreating(false);
    }, []),
  );

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCategory = await onCreateCategory(
      newCategoryName.trim(),
      selectedColor,
    );
    if (newCategory) {
      onSelect(newCategory.id);
      setNewCategoryName("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateCategory();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewCategoryName("");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-left flex items-center justify-between hover:bg-gray-650 focus:ring-sky-500 focus:border-sky-500 focus:outline-none focus:ring-2"
      >
        <span className="flex items-center gap-2">
          {selectedCategory ? (
            <>
              <span
                className={`w-3 h-3 rounded-full ${selectedCategory.color}`}
              />
              <span className="text-gray-100">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-gray-400">No category</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {/* No Category option */}
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className={`w-full p-2 text-left hover:bg-gray-700 flex items-center gap-2 ${
              selectedCategoryId === null ? "bg-gray-700" : ""
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-gray-300">No category</span>
          </button>

          {/* Existing categories */}
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onSelect(category.id);
                setIsOpen(false);
              }}
              className={`w-full p-2 text-left hover:bg-gray-700 flex items-center gap-2 ${
                selectedCategoryId === category.id ? "bg-gray-700" : ""
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${category.color}`} />
              <span className="text-gray-100">{category.name}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-600 my-1" />

          {/* Create new category */}
          {isCreating ? (
            <div className="p-2 space-y-2">
              <input
                ref={inputRef}
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Category name..."
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:ring-sky-500 focus:border-sky-500 focus:outline-none focus:ring-2"
              />
              <ColorPicker
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCategoryName("");
                  }}
                  className="flex-1 p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full p-2 text-left hover:bg-gray-700 flex items-center gap-2 text-sky-400"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Create new category</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
