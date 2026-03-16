"use client";

import { Map, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapVisualMode } from "@/types/app";

const options: Array<{
  value: MapVisualMode;
  label: string;
  icon: typeof Map;
}> = [
  { value: "default", label: "Map", icon: Map },
  { value: "satellite", label: "Satellite", icon: Satellite }
];

export function MapModeToggle({
  value,
  onChange,
  satelliteDisabled = false
}: {
  value: MapVisualMode;
  onChange: (value: MapVisualMode) => void;
  satelliteDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((option) => {
        const Icon = option.icon;
        const disabled = option.value === "satellite" && satelliteDisabled;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap transition md:px-4 md:text-sm",
              value === option.value
                ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/5",
              disabled && "cursor-not-allowed opacity-45 hover:bg-transparent"
            )}
            aria-pressed={value === option.value}
            aria-label={option.label}
            title={disabled ? "Satellite is unavailable right now" : option.label}
          >
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
