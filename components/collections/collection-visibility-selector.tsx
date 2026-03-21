"use client";

import { Globe, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionVisibility } from "@/types/app";

const options: Array<{ value: CollectionVisibility; label: string; icon: any }> = [
  { value: "public", label: "Public", icon: Globe },
  { value: "friends", label: "Friends", icon: Users },
  { value: "private", label: "Only You", icon: Lock }
];

export function CollectionVisibilitySelector({
  value,
  onChange,
  disabled = false,
  className
}: {
  value: CollectionVisibility;
  onChange: (value: CollectionVisibility) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-soft)] p-0.5 border shadow-inner", className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg py-2 transition-all active:scale-[0.97]",
              isActive 
                ? "bg-[var(--surface-strong)] text-[var(--map-accent)] shadow-sm border border-[var(--foreground)]/5" 
                : "text-[var(--foreground)]/50 hover:bg-[var(--foreground)]/5"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-[var(--map-accent)]" : "text-[var(--foreground)]/40")} />
            <span className="text-[10px] font-semibold">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
