import React from "react";
import { ColumnType, Task, ColumnId } from "../types";
import TaskCard from "./TaskCard";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: (column_id: ColumnId) => void;
  onOpenTaskModal: (task: Task) => void;
  onTaskDragStart: (
    event: React.DragEvent,
    taskId: string,
    sourceColumnId: ColumnId,
  ) => void;
  onTaskDragOver: (event: React.DragEvent, targetColumnId: ColumnId) => void;
  onTaskDrop: (event: React.DragEvent, targetColumnId: ColumnId) => void;
  draggedTaskId?: string | null;
}

const ColumnComponent: React.FC<ColumnProps> = ({
  column,
  tasks,
  onAddTask,
  onOpenTaskModal,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDrop,
  draggedTaskId,
}) => {
  return (
    <div
      className="bg-gray-800 rounded-lg p-4 flex flex-col max-h-[calc(100vh-10rem)] shadow-lg"
      onDragOver={(e) => onTaskDragOver(e, column.id)}
      onDrop={(e) => onTaskDrop(e, column.id)}
    >
      <div className="flex justify-between items-center sticky top-0 bg-gray-800 py-3 z-10 -mx-4 px-4 border-b border-gray-700 mb-3">
        <h2 className="text-xl font-semibold text-sky-300">
          {column.title}{" "}
          <span className="text-sm font-normal text-gray-400">
            ({tasks.length})
          </span>
        </h2>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1.5 rounded-full text-sky-400 hover:text-sky-200 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-all duration-150"
          aria-label={`Add new task to ${column.title}`}
          title={`Add new task to ${column.title}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      </div>
      <div className="flex-grow overflow-y-auto space-y-3 column-tasks pr-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onOpenTaskModal}
            onDragStart={(e) => onTaskDragStart(e, task.id, column.id)}
            isDragging={draggedTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-4 border-2 border-dashed border-gray-700 rounded-md mt-1">
            Drag tasks here or add a new one using the '+' button above.
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnComponent;
