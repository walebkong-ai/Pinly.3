"use client";

import { RefreshCcw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/components/network/network-status-provider";

export function OfflineBanner() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-[1.5rem] border bg-[rgba(24,85,56,0.94)] px-4 py-3 text-[var(--background)] shadow-[0_20px_40px_rgba(24,85,56,0.22)] backdrop-blur">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
          <WifiOff className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">No connection</p>
          <p className="text-xs leading-5 text-[var(--background)]/78">
            Pinly stays open, but fresh map data, uploads, and sign-in actions need the internet.
          </p>
        </div>
        <Button
          variant="secondary"
          className="h-11 shrink-0 border-white/12 bg-white/12 text-[var(--background)] hover:bg-white/18 focus:ring-white/35"
          onClick={() => router.refresh()}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
