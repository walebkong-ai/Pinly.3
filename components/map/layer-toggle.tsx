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
    <div className="glass-panel inline-flex rounded-full p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            value === option.value ? "bg-[var(--foreground)] text-white" : "text-[var(--foreground)]/62 hover:bg-white/60"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
