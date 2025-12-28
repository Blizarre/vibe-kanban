import React from "react";
import { Task, Category } from "../types";
import CategoryBadge from "./CategoryBadge";

interface TaskCardProps {
  task: Task;
  category: Category | null;
  onClick: (task: Task) => void;
  onDragStart: (event: React.DragEvent) => void;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  category,
  onClick,
  onDragStart,
  isDragging = false,
}) => {
  return (
    <div
      data-task-id={task.id}
      draggable
      onDragStart={onDragStart}
      onClick={() => onClick(task)}
      className={`bg-gray-700 p-3 rounded-md shadow-md cursor-grab hover:bg-gray-600 transition-all duration-150 ${
        isDragging ? "opacity-50 scale-95 ring-2 ring-sky-400 shadow-lg" : ""
      }`}
    >
      <h3 className="select-none font-medium text-gray-50 break-words">
        {task.title}
      </h3>
      {category && (
        <div className="mt-2">
          <CategoryBadge category={category} size="sm" />
        </div>
      )}
    </div>
  );
};

export default TaskCard;
