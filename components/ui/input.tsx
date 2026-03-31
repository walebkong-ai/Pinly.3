import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-[var(--pinly-control-height)] w-full rounded-[1.125rem] border bg-[var(--surface-soft)] px-[var(--pinly-input-padding-x)] py-[var(--pinly-input-padding-y)] text-[0.9375rem] leading-5 outline-none transition placeholder:text-[var(--foreground)]/45 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/15",
        className
      )}
      {...props}
    />
  );
}
