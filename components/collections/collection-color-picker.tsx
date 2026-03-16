"use client";

import { cn } from "@/lib/utils";
import { COLLECTION_COLORS } from "@/lib/validation";
import { Check } from "lucide-react";

const COLOR_LABELS: Record<string, string> = {
  "#E04040": "Red",
  "#E07A40": "Orange",
  "#D4B800": "Yellow",
  "#3A9E5C": "Green",
  "#38B6C9": "Teal",
  "#3A6EC9": "Blue",
  "#7A40C9": "Purple",
  "#C940A0": "Pink"
};

export function CollectionColorPicker({
  value,
  onChange
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/45">
        Color
      </p>
      <div className="flex flex-wrap gap-2.5">
        {COLLECTION_COLORS.map((color) => {
          const isSelected = value === color;
          return (
            <button
              key={color}
              type="button"
              aria-label={COLOR_LABELS[color] ?? color}
              onClick={() => onChange(isSelected ? null : color)}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
              style={{
                backgroundColor: color,
                outline: isSelected ? `2px solid ${color}` : "2px solid transparent",
                outlineOffset: "2px"
              }}
            >
              {isSelected && (
                <Check
                  className="h-4 w-4 text-white drop-shadow-sm"
                  strokeWidth={2.5}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
