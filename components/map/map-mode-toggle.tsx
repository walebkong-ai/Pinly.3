"use client";

import React from "react";
import { Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapVisualMode } from "@/types/app";

type SatelliteAvailability = "available" | "missing" | "failed";

export function MapModeToggle({
  value,
  onChange,
  satelliteAvailability = "available"
}: {
  value: MapVisualMode;
  onChange: (value: MapVisualMode) => void;
  satelliteAvailability?: SatelliteAvailability;
}) {
  const satelliteEnabled = value === "satellite";
  const title =
    satelliteAvailability === "missing"
      ? "Satellite view is not configured in this build"
      : satelliteAvailability === "failed"
        ? "Satellite is unavailable right now"
        : satelliteEnabled
          ? "Switch back to the default map"
          : "Switch to satellite mode";

  return (
    <button
      type="button"
      onClick={() => onChange(satelliteEnabled ? "default" : "satellite")}
      className="pinly-map-toolbox-button"
      aria-pressed={satelliteEnabled}
      data-pinly-map-toolbox="true"
      data-state={satelliteEnabled ? "satellite" : "default"}
      data-availability={satelliteAvailability}
      aria-label={
        satelliteAvailability === "missing"
          ? "Satellite view is not configured in this build"
          : satelliteAvailability === "failed"
            ? "Satellite view is temporarily unavailable"
            : satelliteEnabled
              ? "Turn satellite mode off"
              : "Turn satellite mode on"
      }
      title={title}
    >
      <span className="pinly-map-toolbox-button__icon">
        <Satellite className="h-3.5 w-3.5" />
      </span>
      <span>Satellite</span>
      <span
        aria-hidden="true"
        className={cn(
          "pinly-map-toolbox-button__status",
          satelliteEnabled
            ? "pinly-map-toolbox-button__status--active"
            : satelliteAvailability === "failed"
              ? "pinly-map-toolbox-button__status--failed"
              : satelliteAvailability === "missing"
                ? "pinly-map-toolbox-button__status--missing"
                : "pinly-map-toolbox-button__status--inactive"
        )}
      />
    </button>
  );
}
