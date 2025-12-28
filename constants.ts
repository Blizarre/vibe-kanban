import { ColumnType, ColumnId } from "./types";

export const COLUMN_DEFINITIONS: ColumnType[] = [
  { id: ColumnId.IDEAS, title: "💡 Ideas" },
  { id: ColumnId.SELECTED, title: "🎯 Selected" },
  { id: ColumnId.IN_PROGRESS, title: "⚙️ In Progress" },
  { id: ColumnId.PARKED, title: "🅿️ Parked" },
  { id: ColumnId.DONE, title: "✅ Done" },
];

export interface CategoryColor {
  id: string;
  class: string;
  name: string;
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { id: "red", class: "bg-red-500", name: "Red" },
  { id: "orange", class: "bg-orange-500", name: "Orange" },
  { id: "amber", class: "bg-amber-500", name: "Amber" },
  { id: "yellow", class: "bg-yellow-500", name: "Yellow" },
  { id: "lime", class: "bg-lime-500", name: "Lime" },
  { id: "green", class: "bg-green-500", name: "Green" },
  { id: "emerald", class: "bg-emerald-500", name: "Emerald" },
  { id: "cyan", class: "bg-cyan-500", name: "Cyan" },
  { id: "sky", class: "bg-sky-500", name: "Sky" },
  { id: "blue", class: "bg-blue-500", name: "Blue" },
  { id: "violet", class: "bg-violet-500", name: "Violet" },
  { id: "pink", class: "bg-pink-500", name: "Pink" },
];
