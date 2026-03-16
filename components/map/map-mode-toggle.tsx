"use client";

import { Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapVisualMode } from "@/types/app";

export function MapModeToggle({
  value,
  onChange,
  satelliteDisabled = false
}: {
  value: MapVisualMode;
  onChange: (value: MapVisualMode) => void;
  satelliteDisabled?: boolean;
}) {
  const satelliteEnabled = value === "satellite";

  return (
    <button
      type="button"
      onClick={() => onChange(satelliteEnabled ? "default" : "satellite")}
      disabled={satelliteDisabled}
      className={cn(
        "glass-panel inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium whitespace-nowrap shadow-lg shadow-black/10 transition md:px-3.5 md:text-xs",
        satelliteEnabled
          ? "border-[rgba(252,236,218,0.14)] bg-[rgba(8,17,26,0.82)] text-[var(--background)] shadow-[0_14px_30px_rgba(7,16,24,0.34)]"
          : "text-[var(--foreground)]/78 hover:bg-[rgba(255,250,244,0.96)]",
        satelliteDisabled && "cursor-not-allowed opacity-45 hover:bg-[var(--card)]"
      )}
      aria-pressed={satelliteEnabled}
      aria-label={satelliteEnabled ? "Turn satellite mode off" : "Turn satellite mode on"}
      title={
        satelliteDisabled
          ? "Satellite is unavailable right now"
          : satelliteEnabled
            ? "Switch back to the default map"
            : "Switch to satellite mode"
      }
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
          satelliteEnabled ? "bg-[rgba(252,236,218,0.16)]" : "bg-[var(--foreground)]/8"
        )}
      >
        <Satellite className="h-3.5 w-3.5" />
      </span>
      <span>Satellite</span>
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full transition",
          satelliteEnabled ? "bg-[var(--map-accent)] shadow-[0_0_0_4px_rgba(56,182,201,0.18)]" : "bg-[var(--foreground)]/18"
        )}
      />
    </button>
  );
}
