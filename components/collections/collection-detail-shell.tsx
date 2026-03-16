"use client";

import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";

// Both components use browser APIs (MapLibre, router) — must be ssr:false.
const CollectionMapView = dynamic(
  () => import("@/components/collections/collection-map-view").then((m) => m.CollectionMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 items-center justify-center rounded-[1.4rem] border bg-[var(--surface-soft)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--foreground)]/30" />
      </div>
    )
  }
);

const CollectionColorEditor = dynamic(
  () => import("@/components/collections/collection-color-editor").then((m) => m.CollectionColorEditor),
  { ssr: false }
);

export function CollectionDetailShell({
  collectionId,
  color,
  hasPosts
}: {
  collectionId: string;
  color: string | null;
  hasPosts: boolean;
}) {
  return (
    <>
      {/* Inline color editor inside the header card */}
      <div className="mt-4 border-t border-[var(--foreground)]/6 pt-4">
        <CollectionColorEditor collectionId={collectionId} initialColor={color} />
      </div>

      {/* Route map — shown when collection has memories */}
      {hasPosts && (
        <div className="mt-4">
          <CollectionMapView collectionId={collectionId} color={color} />
        </div>
      )}
    </>
  );
}
