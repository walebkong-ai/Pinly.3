import Image from "next/image";
import Link from "next/link";
import { FolderOpen, MapPin } from "lucide-react";
import type { CollectionSummary } from "@/types/app";
import { formatVisitDate, getMediaProxyUrl } from "@/lib/utils";

export function CollectionCard({
  collection,
  compact = false
}: {
  collection: CollectionSummary;
  compact?: boolean;
}) {
  const previewPost = collection.previewPost;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group overflow-hidden rounded-[1.5rem] border bg-[var(--surface-strong)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/40"
    >
      <div className={compact ? "aspect-[1.3/1]" : "aspect-[4/3]"}>
        {previewPost ? (
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src={getMediaProxyUrl(previewPost.thumbnailUrl ?? previewPost.mediaUrl)}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              unoptimized={getMediaProxyUrl(previewPost.thumbnailUrl ?? previewPost.mediaUrl).startsWith("/api/media")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="line-clamp-1 text-lg font-semibold">{collection.name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">
                  {previewPost.placeName}, {previewPost.city}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,rgba(252,236,218,0.96),rgba(252,236,218,0.82))] p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--map-accent)] shadow-sm">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">{collection.name}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/58">Add memories from your full post view.</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{collection.name}</p>
          <p className="mt-1 text-xs text-[var(--foreground)]/55">
            {collection.postCount} {collection.postCount === 1 ? "memory" : "memories"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/48">
          Updated {formatVisitDate(collection.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
