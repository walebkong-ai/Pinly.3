import Link from "next/link";
import { Clock3, Layers3, MapPin } from "lucide-react";
import { MediaView } from "@/components/post/media-view";
import { LocationCountryText } from "@/components/ui/country-flag";
import { buildPostLocationMapHref } from "@/lib/map-post-navigation";
import type { OnThisDayMemoryGroup } from "@/lib/on-this-day";

const longDateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

function buildMemoryTitle(group: OnThisDayMemoryGroup) {
  const caption = group.leadPost.caption.trim();

  if (caption.length > 0) {
    return caption;
  }

  if (group.memoryCount > 1) {
    return `${group.memoryCount} memories from ${group.placeName}`;
  }

  return `Memory from ${group.placeName}`;
}

function buildMemorySubtitle(group: OnThisDayMemoryGroup) {
  if (group.memoryCount > 1 && group.collection) {
    return `${group.memoryCount} memories from ${group.collection.name}`;
  }

  if (group.memoryCount > 1) {
    return `${group.memoryCount} memories from the same day`;
  }

  return group.yearsAgo === 1 ? "1 year ago" : `${group.yearsAgo} years ago`;
}

export function OnThisDaySection({ groups }: { groups: OnThisDayMemoryGroup[] }) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="glass-panel rounded-[1.75rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Memory reminder</p>
          <h2 className="mt-1.5 font-[var(--font-serif)] text-2xl">On This Day</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/64">
            Revisit a place you pinned around this time of year in past trips.
          </p>
        </div>
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--map-accent)] sm:flex">
          <Clock3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {groups.map((group) => (
          <article
            key={group.id}
            className="w-[18.5rem] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border bg-[var(--surface-soft)]"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <MediaView
                mediaType={group.leadPost.mediaType}
                mediaUrl={group.leadPost.mediaUrl}
                thumbnailUrl={group.leadPost.thumbnailUrl}
                showVideoControls={false}
              />
            </div>

            {group.posts.length > 1 ? (
              <div className="grid grid-cols-2 gap-2 border-t bg-[var(--surface-strong)] p-2">
                {group.posts.slice(1, 3).map((post) => (
                  <div key={post.id} className="relative aspect-[1.2/1] overflow-hidden rounded-[1rem]">
                    <MediaView
                      mediaType={post.mediaType}
                      mediaUrl={post.mediaUrl}
                      thumbnailUrl={post.thumbnailUrl}
                      showVideoControls={false}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2 text-[11px] text-[var(--foreground)]/55">
                <span className="inline-flex items-center rounded-full border bg-[var(--surface-strong)] px-2.5 py-1 uppercase tracking-[0.16em]">
                  {buildMemorySubtitle(group)}
                </span>
                <span className="inline-flex items-center rounded-full border bg-[var(--surface-strong)] px-2.5 py-1">
                  {longDateFormatter.format(new Date(group.visitedAt))}
                </span>
              </div>

              <div>
                <p className="line-clamp-3 font-[var(--font-serif)] text-lg leading-snug text-[var(--foreground)]">
                  {buildMemoryTitle(group)}
                </p>
                <div className="mt-2 flex min-w-0 max-w-full items-center gap-1 text-sm text-[var(--foreground)]/62">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--map-accent)]" />
                  <span className="truncate">{group.placeName},</span>
                  <LocationCountryText
                    city={group.city}
                    country={group.country}
                    className="min-w-0 max-w-full"
                  />
                </div>
              </div>

              {group.collection ? (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border bg-[var(--surface-strong)] px-3 py-1.5 text-xs text-[var(--foreground)]/66">
                  <Layers3 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{group.collection.name}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Link
                  href={`/posts/${group.leadPost.id}`}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-92"
                >
                  Open memory
                </Link>
                <Link
                  href={buildPostLocationMapHref(group.leadPost)}
                  scroll={false}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--foreground)]/5"
                >
                  Map
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

