"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, UserPlus, Plus, X } from "lucide-react";

const STORAGE_KEY = "pinly-welcome-dismissed";
const SESSION_KEY = "pinly-welcome-session-consumed";

export function WelcomeCard({ forceOpen = false }: { forceOpen?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(STORAGE_KEY);
      const wasForcedThisSession = sessionStorage.getItem(SESSION_KEY);

      if ((forceOpen && !wasForcedThisSession) || !wasDismissed) {
        setVisible(true);
      }
    } catch {
      // Private browsing may block localStorage
    }
  }, [forceOpen]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore
    }
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-auto w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="relative rounded-[1.75rem] border bg-[var(--surface-strong)] p-5 shadow-xl backdrop-blur-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)]/50 transition hover:bg-[var(--foreground)]/14"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Welcome to Pinly</p>
        <h2 className="mt-2 font-[var(--font-serif)] text-xl leading-tight">Your map is ready.</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
          Pin memories to the places that matter. Start with one memory, a couple of real friends, and a quick look around the globe.
        </p>

        <div className="mt-4 space-y-2.5">
          <Link
            href="/create"
            onClick={dismiss}
            className="flex items-center gap-3 rounded-2xl border bg-[var(--accent-soft)] p-3 transition hover:bg-[var(--accent-soft)]/80"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm">
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
            className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-soft)] p-3 transition hover:bg-[var(--foreground)]/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--social-accent-soft)] text-[var(--social-accent)] shadow-sm">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Add friends</p>
              <p className="text-xs text-[var(--foreground)]/55">See each other's pins on the map</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 rounded-2xl border bg-[var(--map-accent-soft)] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--map-accent)] text-white shadow-sm">
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
          className="mt-4 w-full rounded-full border bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--foreground)]/90"
        >
          Got it, let me explore
        </button>
      </div>
    </div>
  );
}
