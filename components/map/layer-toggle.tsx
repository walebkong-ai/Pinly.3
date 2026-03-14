"use client";

import type { LayerMode } from "@/types/app";
import { cn } from "@/lib/utils";

const options: Array<{ value: LayerMode; label: string }> = [
  { value: "friends", label: "Friends" },
  { value: "you", label: "You" },
  { value: "both", label: "Both" }
];

export function LayerToggle({
  value,
  onChange
}: {
  value: LayerMode;
  onChange: (value: LayerMode) => void;
}) {
  return (
    <div className="flex items-center">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition",
            value === option.value ? "bg-[var(--foreground)] text-white shadow-sm" : "text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/5"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
