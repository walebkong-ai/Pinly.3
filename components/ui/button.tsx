import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "pinly-pressable inline-flex min-h-11 items-center justify-center rounded-full border border-transparent px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm hover:opacity-95 focus:ring-[var(--accent)]",
        variant === "secondary" && "border bg-[var(--surface-strong)] text-[var(--foreground)] hover:bg-[var(--muted)] focus:ring-[var(--foreground)]",
        variant === "ghost" && "bg-transparent text-[var(--foreground)] hover:bg-[var(--foreground)]/6 focus:ring-[var(--foreground)]",
        variant === "danger" && "bg-[var(--danger)] text-white hover:opacity-90 focus:ring-[var(--danger)]",
        className
      )}
      {...props}
    />
  );
}
