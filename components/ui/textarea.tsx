import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-3xl border bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--foreground)]/45 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/15",
        className
      )}
      {...props}
    />
  );
}
