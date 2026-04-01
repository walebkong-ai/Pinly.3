"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { OverlayPortal } from "@/components/app/overlay-portal";
import { useOverlayIsolation } from "@/components/app/use-overlay-isolation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAP_CATEGORY_OPTIONS } from "@/lib/map-filters";
import type { LayerMode, MapCategory, MapGroupOption, TimeFilter } from "@/types/app";

const timeOptions: Array<{ value: TimeFilter; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "30d", label: "Last 30 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" }
];

const collectionOverlayOptions: Array<{ value: LayerMode; label: string }> = [
  { value: "both", label: "Both" },
  { value: "friends", label: "Friends" },
  { value: "you", label: "You" }
];

export function FilterSidebar({
  open,
  time,
  selectedGroupIds,
  selectedCategories,
  groupOptions,
  collectionsOverlayMode,
  collectionsOverlayCount,
  collectionsOverlayLoading,
  onTimeChange,
  onToggleGroup,
  onToggleCategory,
  onToggleCollectionsOverlay,
  onChangeCollectionsOverlayMode,
  onClear,
  onClose
}: {
  open: boolean;
  time: TimeFilter;
  selectedGroupIds: string[];
  selectedCategories: MapCategory[];
  groupOptions: MapGroupOption[];
  collectionsOverlayMode: LayerMode | null;
  collectionsOverlayCount: number;
  collectionsOverlayLoading: boolean;
  onTimeChange: (value: TimeFilter) => void;
  onToggleGroup: (groupId: string) => void;
  onToggleCategory: (category: MapCategory) => void;
  onToggleCollectionsOverlay: () => void;
  onChangeCollectionsOverlayMode: (value: LayerMode) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  useOverlayIsolation(open, { scopeName: "sidebar" });

  useEffect(() => {
    if (!open) {
      return;
    }

    sidebarRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[980] pointer-events-none">
        <div
          data-testid="map-filter-backdrop"
          className={cn(
            "absolute inset-0 bg-[rgba(8,17,26,0.32)] backdrop-blur-[3px] transition-opacity duration-200 ease-out",
            open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={onClose}
        />
        <div
          ref={sidebarRef}
          id="pinly-map-filters"
          role="dialog"
          aria-label="Map filters"
          aria-modal="true"
          aria-hidden={!open}
          data-testid="map-filter-sidebar"
          tabIndex={-1}
          className={cn(
            "glass-panel absolute inset-y-0 right-0 flex w-[min(18.75rem,80vw)] max-w-[min(18.75rem,80vw)] flex-col overflow-y-auto overscroll-contain rounded-l-[1.75rem] border-l pl-4 pr-[max(1rem,var(--safe-area-right))] pt-[max(1rem,var(--safe-area-top))] will-change-transform transition-transform duration-200 ease-out sm:w-[18.75rem] sm:max-w-[18.75rem]",
            "pb-[calc(1rem+var(--safe-area-bottom))]",
            open ? "pointer-events-auto translate-x-0 shadow-2xl shadow-black/18" : "pointer-events-none translate-x-full"
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="pinly-eyebrow">Filters</p>
              <h2 className="pinly-display-title">Refine the map</h2>
            </div>
            <Button variant="ghost" className="h-11 w-11 rounded-full p-0" onClick={onClose} aria-label="Close filters">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <section className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold">Collections/Trips</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/58">
                Turn on the map overlay for collections and trips, then choose whose routes to show.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleCollectionsOverlay}
              className={cn(
                "flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-3 text-left text-sm transition",
                collectionsOverlayMode
                  ? "border-[rgba(56,182,201,0.24)] bg-[var(--map-accent-soft)] text-[var(--foreground)]"
                  : "bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)]"
              )}
            >
              <div className="space-y-1">
                <p className="font-medium">Collections/Trips</p>
                <p className="text-xs text-[var(--foreground)]/56">
                  {collectionsOverlayMode
                    ? collectionsOverlayLoading
                      ? "Loading routes on the map..."
                      : collectionsOverlayCount > 0
                        ? `${collectionsOverlayCount} collection${collectionsOverlayCount === 1 ? "" : "s"} on the map`
                        : "No matching collections are visible right now."
                    : "Tap once to turn it on in Both mode."}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  collectionsOverlayMode
                    ? "border-[var(--map-accent)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)]/58"
                )}
              >
                {collectionsOverlayMode ? "On" : "Off"}
              </span>
            </button>
            {collectionsOverlayMode ? (
              <div className="grid grid-cols-3 gap-2">
                {collectionOverlayOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeCollectionsOverlayMode(option.value)}
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition",
                      collectionsOverlayMode === option.value
                        ? "border-[rgba(56,182,201,0.24)] bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                        : "bg-[var(--surface-soft)] text-[var(--foreground)]/72 hover:bg-[var(--surface-strong)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-6 space-y-4">
            <p className="text-sm font-semibold">Time</p>
            <div className="space-y-2">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTimeChange(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-3 text-left text-sm transition",
                    time === option.value
                      ? "border-[rgba(56,182,201,0.24)] bg-[var(--map-accent-soft)] text-[var(--foreground)]"
                      : "bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)]"
                  )}
                >
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full border",
                      time === option.value && "border-[var(--map-accent)] bg-[var(--map-accent)]"
                    )}
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold">Groups</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/58">Create a temporary friend group for this map view.</p>
            </div>
            {!groupOptions.length ? (
              <div className="rounded-3xl border bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--foreground)]/58">
                Add friends to unlock group filtering.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groupOptions.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => onToggleGroup(group.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-3 py-2 text-sm transition",
                      selectedGroupIds.includes(group.id)
                        ? "border-[rgba(56,182,201,0.24)] bg-[var(--map-accent-soft)] text-[var(--foreground)]"
                        : "bg-[var(--surface-soft)] text-[var(--foreground)]/72 hover:bg-[var(--surface-strong)]"
                    )}
                  >
                    <span>{group.label}</span>
                    <span className="ml-2 text-xs text-[var(--foreground)]/45">{group.description}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold">Categories</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/58">Narrow the map by media type and memory category.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MAP_CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => onToggleCategory(category.value)}
                  className={cn(
                    "min-h-11 rounded-full border px-3 py-2 text-sm transition",
                    selectedCategories.includes(category.value)
                      ? "border-[rgba(56,182,201,0.24)] bg-[var(--map-accent-soft)] text-[var(--foreground)]"
                      : "bg-[var(--surface-soft)] text-[var(--foreground)]/72 hover:bg-[var(--surface-strong)]"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--pinly-panel-radius-lg)] border bg-[var(--surface-soft)] p-4 text-sm text-[var(--foreground)]/62">
            <span>Filters are applied instantly.</span>
            <Button variant="secondary" onClick={onClear}>
              Clear all
            </Button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
