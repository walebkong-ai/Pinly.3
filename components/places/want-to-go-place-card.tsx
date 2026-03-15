"use client";

import { useState } from "react";
import { CalendarDays, Crosshair, MapPin } from "lucide-react";
import type { WantToGoPlaceSummary } from "@/types/app";
import { DirectionsSheet } from "@/components/post/directions-sheet";
import { WantToGoButton } from "@/components/places/want-to-go-button";
import { formatVisitDate } from "@/lib/utils";

export function WantToGoPlaceCard({
  place,
  onRemoved
}: {
  place: WantToGoPlaceSummary;
  onRemoved?: (placeId: string) => void;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <article className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(56,182,201,0.12)] text-[var(--map-accent)]">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Want to go</p>
          <h2 className="mt-1.5 font-[var(--font-serif)] text-2xl leading-tight">{place.placeName}</h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/62">
            {place.city}, {place.country}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground)]/68">
          <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
          Saved {formatVisitDate(place.createdAt)}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground)]/68">
          <Crosshair className="h-4 w-4 text-[var(--map-accent)]" />
          {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <DirectionsSheet post={place} label="Directions" triggerStyle="secondary" />
        <WantToGoButton
          location={place}
          initialItemId={place.id}
          triggerStyle="secondary"
          savedLabel="Remove"
          onSavedChange={(saved) => {
            if (!saved) {
              setVisible(false);
              onRemoved?.(place.id);
            }
          }}
        />
      </div>
    </article>
  );
}
