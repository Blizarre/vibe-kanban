import React from "react";
import { Category } from "../types";

interface CategoryBadgeProps {
  category: Category | null;
  size?: "sm" | "md";
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = "sm",
}) => {
  if (!category) return null;

  const sizeClasses =
    size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";

  return (
    <span
      className={`${category.color} ${sizeClasses} rounded text-white font-medium truncate max-w-[100px] inline-block`}
      title={category.name}
    >
      {category.name}
    </span>
  );
};

export default CategoryBadge;
