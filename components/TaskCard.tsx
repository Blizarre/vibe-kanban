
import React from 'react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onDragStart: (event: React.DragEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDragStart }) => {
  return (
    <div
      data-task-id={task.id}
      draggable
      onDragStart={onDragStart}
      onClick={() => onClick(task)}
      className="bg-gray-700 p-3 rounded-md shadow-md cursor-grab hover:bg-gray-600 transition-colors duration-150"
    >
      <h3 className="font-medium text-gray-50 truncate">{task.title}</h3>
    </div>
  );
};

export default TaskCard;
