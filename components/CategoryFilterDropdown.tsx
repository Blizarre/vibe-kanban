import React, { useState, useRef, useCallback } from "react";
import { Category } from "../types";
import { useClickOutside } from "../hooks/useClickOutside";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { dropdownContainer, dropdownItem } from "../styles";

interface CategoryFilterDropdownProps {
  categories: Category[];
  selectedFilter: string | null; // null = "All", "none" = "No Category", or category ID
  onFilterChange: (filter: string | null) => void;
}

const CategoryFilterDropdown: React.FC<CategoryFilterDropdownProps> = ({
  categories,
  selectedFilter,
  onFilterChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    dropdownRef,
    useCallback(() => setIsOpen(false), []),
  );

  const getSelectedLabel = () => {
    if (selectedFilter === null) return "All Categories";
    if (selectedFilter === "none") return "No Category";
    const category = categories.find((c) => c.id === selectedFilter);
    return category?.name || "Unknown";
  };

  const getSelectedColor = () => {
    if (selectedFilter === null) return null;
    if (selectedFilter === "none") return "bg-gray-500";
    const category = categories.find((c) => c.id === selectedFilter);
    return category?.color || null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-sm hover:bg-gray-650 focus:ring-sky-500 focus:border-sky-500 focus:outline-none focus:ring-2"
      >
        <span className="text-gray-400">Filter:</span>
        <span className="flex items-center gap-1.5">
          {getSelectedColor() && (
            <span
              className={`w-2.5 h-2.5 rounded-full ${getSelectedColor()}`}
            />
          )}
          <span className="text-gray-100">{getSelectedLabel()}</span>
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className={`${dropdownContainer} min-w-[160px]`}>
          {/* All Categories option */}
          <button
            type="button"
            onClick={() => {
              onFilterChange(null);
              setIsOpen(false);
            }}
            className={`${dropdownItem} ${selectedFilter === null ? "bg-gray-700" : ""}`}
          >
            <span className="text-gray-100">All Categories</span>
          </button>

          {/* No Category option */}
          <button
            type="button"
            onClick={() => {
              onFilterChange("none");
              setIsOpen(false);
            }}
            className={`${dropdownItem} ${selectedFilter === "none" ? "bg-gray-700" : ""}`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span className="text-gray-300">No Category</span>
          </button>

          {categories.length > 0 && (
            <div className="border-t border-gray-600 my-1" />
          )}

          {/* Category options */}
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onFilterChange(category.id);
                setIsOpen(false);
              }}
              className={`${dropdownItem} ${selectedFilter === category.id ? "bg-gray-700" : ""}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${category.color}`} />
              <span className="text-gray-100">{category.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilterDropdown;
