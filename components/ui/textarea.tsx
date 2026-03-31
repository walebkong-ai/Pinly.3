import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[1.25rem] border bg-[var(--surface-soft)] px-[var(--pinly-input-padding-x)] py-[var(--pinly-input-padding-y)] text-[0.9375rem] leading-6 outline-none transition placeholder:text-[var(--foreground)]/45 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/15",
        className
      )}
      {...props}
    />
  );
}
