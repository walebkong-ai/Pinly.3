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
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-95 focus:ring-[var(--accent)]",
        variant === "secondary" && "bg-[var(--card-strong)] text-[var(--foreground)] border hover:bg-[var(--muted)] focus:ring-[var(--foreground)]",
        variant === "ghost" && "bg-transparent text-[var(--foreground)] hover:bg-white/50 focus:ring-[var(--foreground)]",
        variant === "danger" && "bg-[var(--danger)] text-white hover:opacity-90 focus:ring-[var(--danger)]",
        className
      )}
      {...props}
    />
  );
}
