import React from "react";
import { CATEGORY_COLORS } from "../constants";

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  ringOffsetColor?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  ringOffsetColor = "ring-offset-gray-800",
}) => {
  return (
    <div className="flex flex-wrap gap-1">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          onClick={() => onColorSelect(color.class)}
          className={`w-6 h-6 rounded-full ${color.class} ${
            selectedColor === color.class
              ? `ring-2 ring-white ring-offset-1 ${ringOffsetColor}`
              : ""
          }`}
          title={color.name}
        />
      ))}
    </div>
  );
};

export default ColorPicker;
