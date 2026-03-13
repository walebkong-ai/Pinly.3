import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border bg-white/70 px-4 py-3 text-sm outline-none transition placeholder:text-[var(--foreground)]/45 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15",
        className
      )}
      {...props}
    />
  );
}
