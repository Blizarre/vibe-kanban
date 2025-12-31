import React from "react";
import { ColumnType, Task, ColumnId, Category } from "../types";
import TaskCard from "./TaskCard";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { iconButtonSky, iconButtonRed } from "../styles";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  categoriesById: Record<string, Category>;
  onAddTask: (column_id: ColumnId) => void;
  onOpenTaskModal: (task: Task) => void;
  onEmptyColumn: (column_id: ColumnId) => void;
  onTaskDragStart: (
    event: React.DragEvent,
    taskId: string,
    sourceColumnId: ColumnId,
  ) => void;
  onTaskDragOver: (event: React.DragEvent, targetColumnId: ColumnId) => void;
  onTaskDrop: (event: React.DragEvent, targetColumnId: ColumnId) => void;
  draggedTaskId?: string | null;
  dragOverColumn?: ColumnId | null;
  dragOverIndex?: number | null;
}

const ColumnComponent: React.FC<ColumnProps> = ({
  column,
  tasks,
  categoriesById,
  onAddTask,
  onOpenTaskModal,
  onEmptyColumn,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDrop,
  draggedTaskId,
  dragOverColumn,
  dragOverIndex,
}) => {
  return (
    <div
      data-column-id={column.id}
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
        <div className="flex gap-2">
          <button
            onClick={() => onAddTask(column.id)}
            className={iconButtonSky}
            aria-label={`Add new task to ${column.title}`}
            title={`Add new task to ${column.title}`}
          >
            <PlusIcon className="w-5 h-5" />
          </button>
          {column.id === ColumnId.DONE && (
            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to empty all tasks in "${column.title}"?`,
                  )
                ) {
                  onEmptyColumn(column.id);
                }
              }}
              className={iconButtonRed}
              aria-label={`Empty all tasks in ${column.title}`}
              title={`Empty all tasks in ${column.title}`}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto space-y-3 column-tasks pr-2">
        {(() => {
          // Calculate filtered tasks and end index once
          const filteredTasks = tasks.filter((t) => t.id !== draggedTaskId);
          const isEndPosition =
            dragOverColumn === column.id &&
            dragOverIndex === filteredTasks.length;

          return (
            <>
              {tasks.map((task, index) => {
                const shouldShowDropIndicator =
                  dragOverColumn === column.id &&
                  dragOverIndex === index &&
                  draggedTaskId !== task.id &&
                  !isEndPosition; // Don't show "before" indicator if we're at the end

                return (
                  <React.Fragment key={task.id}>
                    {shouldShowDropIndicator && (
                      <div className="h-1 bg-sky-400 rounded-full mx-2 opacity-75 animate-pulse" />
                    )}
                    <TaskCard
                      task={task}
                      category={
                        task.category_id
                          ? categoriesById[task.category_id] || null
                          : null
                      }
                      onClick={onOpenTaskModal}
                      onDragStart={(e) =>
                        onTaskDragStart(e, task.id, column.id)
                      }
                      isDragging={draggedTaskId === task.id}
                    />
                  </React.Fragment>
                );
              })}

              {/* Drop indicator at the end of the column */}
              {isEndPosition && (
                <div className="h-1 bg-sky-400 rounded-full mx-2 opacity-75 animate-pulse" />
              )}
            </>
          );
        })()}

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
