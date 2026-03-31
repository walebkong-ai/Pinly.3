import Link from "next/link";
import { FolderOpen, ImageOff, MapPin } from "lucide-react";
import { RevealImage } from "@/components/ui/reveal-image";
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
  const color = collection.color;
  const previewUrl = previewPost ? getMediaProxyUrl(previewPost.thumbnailUrl ?? previewPost.mediaUrl) : "";

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group overflow-hidden rounded-[var(--pinly-panel-radius)] border bg-[var(--surface-strong)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/40"
    >
      <div className={compact ? "aspect-[1.3/1]" : "aspect-[4/3]"}>
        {previewPost ? (
          <div className="relative h-full w-full overflow-hidden">
            {previewUrl ? (
              <RevealImage
                src={previewUrl}
                alt=""
                fill
                sizes={compact ? "(max-width: 768px) 50vw, 33vw" : "(max-width: 768px) 100vw, 33vw"}
                wrapperClassName="h-full w-full"
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--surface-soft)] text-[var(--foreground)]/45">
                <ImageOff className="h-7 w-7" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
              <p className="line-clamp-1 text-[1.02rem] font-semibold">{collection.name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">
                  {previewPost.placeName}, {previewPost.city}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex h-full flex-col justify-between p-4"
            style={{
              background: color
                ? `linear-gradient(180deg, ${color}30, ${color}18)`
                : "linear-gradient(180deg,rgba(252,236,218,0.96),rgba(252,236,218,0.82))"
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm"
              style={{ backgroundColor: color ?? "var(--surface-strong)" }}
            >
              <FolderOpen className="h-5 w-5" style={{ color: color ? "white" : "var(--map-accent)" }} />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">{collection.name}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/58">Add memories from your full post view.</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div className="flex min-w-0 items-center gap-2">
          {color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          )}
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{collection.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-xs text-[var(--foreground)]/55">
            {collection.postCount} {collection.postCount === 1 ? "memory" : "memories"}
          </p>
          <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/48">
            {formatVisitDate(collection.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
