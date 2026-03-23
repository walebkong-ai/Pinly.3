"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  disabled = false,
  onCheckedChange,
  "aria-label": ariaLabel
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-11 w-[3.625rem] shrink-0 items-center rounded-full border px-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20 focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-[rgba(24,85,56,0.22)] bg-[var(--foreground)]"
          : "border-[var(--line)] bg-[var(--foreground)]/12"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block h-8 w-8 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[1.25rem]" : "translate-x-0"
        )}
      />
    </button>
  );
}
