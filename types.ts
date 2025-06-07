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
}

export interface ColumnType {
  id: ColumnId;
  title: string;
}
