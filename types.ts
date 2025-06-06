export enum ColumnId {
  IDEAS = "ideas",
  SELECTED = "selected",
  IN_PROGRESS = "inProgress",
  PARKED = "parked",
  DONE = "done",
}

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: ColumnId;
  task_order: number; // Renamed from 'order' for maintaining order within a column
}

export interface ColumnType {
  id: ColumnId;
  title: string;
}
