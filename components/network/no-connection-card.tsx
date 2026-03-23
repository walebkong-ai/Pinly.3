"use client";

import { RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NoConnectionCard({
  title = "No connection",
  message,
  retryLabel = "Retry",
  onRetry,
  className,
  testId
}: {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className={cn("glass-panel rounded-[1.75rem] p-5 text-left", className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(24,85,56,0.08)] text-[var(--foreground)]">
        <WifiOff className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/64">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4 h-11" onClick={onRetry}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
