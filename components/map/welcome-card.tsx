"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, UserPlus, Plus, X } from "lucide-react";

const STORAGE_KEY = "pinly-welcome-dismissed";
const SESSION_KEY = "pinly-welcome-session-consumed";

export function WelcomeCard({
  forceOpen = false,
  onVisibilityChange
}: {
  forceOpen?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let nextVisible = false;

    try {
      const wasDismissed = localStorage.getItem(STORAGE_KEY);
      const wasForcedThisSession = sessionStorage.getItem(SESSION_KEY);

      if ((forceOpen && !wasForcedThisSession) || !wasDismissed) {
        nextVisible = true;
      }
    } catch {
      // Private browsing may block localStorage
    }

    setVisible(nextVisible);
    onVisibilityChange?.(nextVisible);
  }, [forceOpen, onVisibilityChange]);

  function dismiss() {
    setVisible(false);
    onVisibilityChange?.(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore
    }
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-auto w-full max-w-[22rem] animate-in fade-in zoom-in-95 duration-300 ease-out sm:max-w-sm">
      <div className="relative max-h-[calc(var(--app-viewport-height)-var(--pinly-mobile-nav-reserve)-var(--safe-area-top)-2rem)] overflow-y-auto overscroll-contain rounded-[var(--pinly-panel-radius-lg)] border bg-[var(--surface-strong)] p-3 shadow-xl backdrop-blur-xl sm:max-h-none sm:p-4">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)]/50 transition hover:bg-[var(--foreground)]/14 sm:right-3 sm:top-3"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <p className="pinly-eyebrow">Welcome to Pinly</p>
        <h2 className="mt-1.5 pr-8 font-[var(--font-serif)] text-[1.1rem] leading-tight sm:mt-2 sm:text-[1.2rem]">Your map is ready.</h2>
        <p className="mt-1.5 text-[13px] leading-5 text-[var(--foreground)]/66 sm:mt-2 sm:text-sm sm:leading-6">
          Pin memories to the places that matter. Start with one memory, a couple of real friends, and a quick look around the globe.
        </p>

        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
          <Link
            href="/create"
            onClick={dismiss}
            className="flex items-center gap-2.5 rounded-[1.25rem] border bg-[var(--accent-soft)] p-2.5 transition hover:bg-[var(--accent-soft)]/80 sm:gap-3 sm:p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm sm:h-9 sm:w-9">
              <Plus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Create your first memory</p>
              <p className="text-xs text-[var(--foreground)]/55">Upload a photo and drop it on the map</p>
            </div>
          </Link>

          <Link
            href="/friends"
            onClick={dismiss}
            className="flex items-center gap-2.5 rounded-[1.25rem] border bg-[var(--surface-soft)] p-2.5 transition hover:bg-[var(--foreground)]/5 sm:gap-3 sm:p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--social-accent-soft)] text-[var(--social-accent)] shadow-sm sm:h-9 sm:w-9">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Add friends</p>
              <p className="text-xs text-[var(--foreground)]/55">See each other&apos;s pins on the map</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 rounded-[1.25rem] border bg-[var(--map-accent-soft)] p-2.5 sm:gap-3 sm:p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--map-accent)] text-white shadow-sm sm:h-9 sm:w-9">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Explore the globe</p>
              <p className="text-xs text-[var(--foreground)]/55">Pan, zoom, and discover memories</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full rounded-full border bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--foreground)]/90 sm:mt-4"
        >
          Got it, let me explore
        </button>
      </div>
    </div>
  );
}
