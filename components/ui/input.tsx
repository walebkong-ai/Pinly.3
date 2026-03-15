import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--foreground)]/45 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/15",
        className
      )}
      {...props}
    />
  );
}
