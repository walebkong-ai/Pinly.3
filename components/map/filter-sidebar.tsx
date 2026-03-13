"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAP_CATEGORY_OPTIONS } from "@/lib/map-filters";
import type { MapCategory, MapGroupOption, TimeFilter } from "@/types/app";

const timeOptions: Array<{ value: TimeFilter; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "30d", label: "Last 30 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" }
];

export function FilterSidebar({
  open,
  time,
  selectedGroupIds,
  selectedCategories,
  groupOptions,
  onTimeChange,
  onToggleGroup,
  onToggleCategory,
  onClear,
  onClose
}: {
  open: boolean;
  time: TimeFilter;
  selectedGroupIds: string[];
  selectedCategories: MapCategory[];
  groupOptions: MapGroupOption[];
  onTimeChange: (value: TimeFilter) => void;
  onToggleGroup: (groupId: string) => void;
  onToggleCategory: (category: MapCategory) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0 z-[780] bg-[var(--foreground)]/18 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "glass-panel absolute inset-y-0 right-0 z-[790] flex w-full max-w-sm flex-col rounded-l-[2rem] border-l p-5 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Filters</p>
            <h2 className="mt-2 font-[var(--font-serif)] text-3xl">Refine the map</h2>
          </div>
          <Button variant="ghost" className="rounded-full p-2" onClick={onClose} aria-label="Close filters">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <section className="mt-8 space-y-4">
          <p className="text-sm font-semibold">Time</p>
          <div className="space-y-2">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTimeChange(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm transition",
                  time === option.value ? "bg-[var(--accent-soft)] text-[var(--foreground)]" : "bg-white/55 hover:bg-white/72"
                )}
              >
                <span>{option.label}</span>
                <span className={cn("h-3 w-3 rounded-full border", time === option.value && "bg-[var(--accent)] border-[var(--accent)]")} />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <p className="text-sm font-semibold">Groups</p>
            <p className="mt-1 text-sm text-[var(--foreground)]/58">Create a temporary friend group for this map view.</p>
          </div>
          {!groupOptions.length && (
            <div className="rounded-3xl border bg-white/55 px-4 py-3 text-sm text-[var(--foreground)]/58">
              Add friends to unlock group filtering.
            </div>
          )}
          {!!groupOptions.length && (
            <div className="flex flex-wrap gap-2">
              {groupOptions.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onToggleGroup(group.id)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-2 text-sm transition",
                    selectedGroupIds.includes(group.id)
                      ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "bg-white/55 text-[var(--foreground)]/72 hover:bg-white/72"
                  )}
                >
                  <span>{group.label}</span>
                  <span className="ml-2 text-xs text-[var(--foreground)]/45">{group.description}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 space-y-4">
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
                  "rounded-full border px-3 py-2 text-sm transition",
                  selectedCategories.includes(category.value)
                    ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                    : "bg-white/55 text-[var(--foreground)]/72 hover:bg-white/72"
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-auto flex items-center justify-between rounded-[1.75rem] border bg-white/60 p-4 text-sm text-[var(--foreground)]/62">
          <span>Filters are wired for future expansion without changing the map flow.</span>
          <Button variant="secondary" onClick={onClear}>
            Clear all
          </Button>
        </div>
      </aside>
    </>
  );
}
