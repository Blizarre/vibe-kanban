import { ColumnType, ColumnId } from "./types";

export const COLUMN_DEFINITIONS: ColumnType[] = [
  { id: ColumnId.IDEAS, title: "💡 Ideas" },
  { id: ColumnId.SELECTED, title: "🎯 Selected" },
  { id: ColumnId.IN_PROGRESS, title: "⚙️ In Progress" },
  { id: ColumnId.PARKED, title: "🅿️ Parked" },
  { id: ColumnId.DONE, title: "✅ Done" },
];
