"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LoaderCircle, MapPinned } from "lucide-react";
import { toast } from "sonner";
import { type WantToGoLocation, buildWantToGoPlaceKey } from "@/lib/want-to-go";
import { cn } from "@/lib/utils";

export function WantToGoButton({
  location,
  initialItemId,
  hydrateFromApi = false,
  triggerStyle = "inline",
  unsavedLabel = "Want to go",
  savedLabel = "Saved place",
  className,
  onSavedChange
}: {
  location: WantToGoLocation;
  initialItemId?: string | null;
  hydrateFromApi?: boolean;
  triggerStyle?: "inline" | "secondary" | "emphasis";
  unsavedLabel?: string;
  savedLabel?: string;
  className?: string;
  onSavedChange?: (saved: boolean, itemId: string | null) => void;
}) {
  const placeKey = useMemo(() => buildWantToGoPlaceKey(location), [location]);
  const [itemId, setItemId] = useState<string | null>(initialItemId ?? null);
  const [saved, setSaved] = useState(Boolean(initialItemId));
  const [hydrating, setHydrating] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialItemId === undefined) {
      return;
    }

    setItemId(initialItemId);
    setSaved(Boolean(initialItemId));
  }, [initialItemId]);

  useEffect(() => {
    if (!hydrateFromApi || initialItemId !== undefined || !placeKey.trim()) {
      return;
    }

    let ignore = false;
    setHydrating(true);

    void fetch(`/api/want-to-go?key=${encodeURIComponent(placeKey)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load saved place state.");
        }

        const data = await response.json();
        if (!ignore) {
          const nextItemId = data.item?.id ?? null;
          setItemId(nextItemId);
          setSaved(Boolean(nextItemId));
        }
      })
      .catch(() => {
        if (!ignore) {
          setItemId(null);
          setSaved(false);
        }
      })
      .finally(() => {
        if (!ignore) {
          setHydrating(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [hydrateFromApi, initialItemId, placeKey]);

  function toggleWantToGo() {
    if (!placeKey.trim()) {
      return;
    }

    startTransition(async () => {
      try {
        if (saved) {
          if (!itemId) {
            throw new Error("Could not remove this place right now.");
          }

          const response = await fetch("/api/want-to-go", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId })
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || "Could not remove this place.");
          }

          setSaved(false);
          setItemId(null);
          onSavedChange?.(false, null);
          return;
        }

        const response = await fetch("/api/want-to-go", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(location)
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Could not save this place.");
        }

        const data = await response.json();
        const nextItemId = data.item?.id ?? null;
        setSaved(true);
        setItemId(nextItemId);
        onSavedChange?.(true, nextItemId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update this place.");
      }
    });
  }

  const disabled = !placeKey.trim() || hydrating || isPending;

  if (triggerStyle === "emphasis") {
    return (
      <button
        type="button"
        onClick={toggleWantToGo}
        disabled={disabled}
        aria-pressed={saved}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
          saved
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
            : "border-[rgba(255,159,28,0.22)] bg-[var(--accent-soft)] text-[var(--foreground)] hover:bg-[rgba(255,159,28,0.2)]",
          className
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            saved ? "bg-white/18 text-white" : "bg-[var(--accent)] text-[var(--accent-foreground)]"
          )}
        >
          {hydrating || isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MapPinned className="h-3.5 w-3.5" />}
        </span>
        <span>{saved ? savedLabel : unsavedLabel}</span>
      </button>
    );
  }

  if (triggerStyle === "secondary") {
    return (
      <button
        type="button"
        onClick={toggleWantToGo}
        disabled={disabled}
        aria-pressed={saved}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
          saved
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
            : "border bg-[var(--surface-strong)] text-[var(--foreground)] hover:bg-[var(--muted)]",
          className
        )}
      >
        {hydrating || isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
        <span>{saved ? savedLabel : unsavedLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleWantToGo}
      disabled={disabled}
      aria-pressed={saved}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        saved ? "text-[var(--accent)]" : "text-[var(--foreground)]/55 hover:text-[var(--accent)]",
        className
      )}
    >
      {hydrating || isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
      <span>{saved ? savedLabel : unsavedLabel}</span>
    </button>
  );
}
