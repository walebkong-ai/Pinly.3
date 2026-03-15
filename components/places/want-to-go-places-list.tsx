"use client";

import Link from "next/link";
import { useState } from "react";
import type { WantToGoPlaceSummary } from "@/types/app";
import { WantToGoPlaceCard } from "@/components/places/want-to-go-place-card";

export function WantToGoPlacesList({
  initialPlaces
}: {
  initialPlaces: WantToGoPlaceSummary[];
}) {
  const [places, setPlaces] = useState(initialPlaces);

  if (places.length === 0) {
    return (
      <div className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center">
        <p className="text-sm text-[var(--foreground)]/58">
          You haven&apos;t saved any want-to-go places yet.
        </p>
        <Link
          href="/map"
          className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-95"
        >
          Explore the map
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {places.map((place) => (
        <WantToGoPlaceCard
          key={place.id}
          place={place}
          onRemoved={(placeId) => setPlaces((current) => current.filter((item) => item.id !== placeId))}
        />
      ))}
    </div>
  );
}
