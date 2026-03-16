"use client";

import { useEffect, useRef, type SyntheticEvent } from "react";
import { CalendarDays, Layers3, MapPin, X } from "lucide-react";
import type { PlaceClusterMarker, PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LocationCountryText } from "@/components/ui/country-flag";
import { MediaView } from "@/components/post/media-view";
import { ProfileLink } from "@/components/profile/profile-link";
import { formatVisitDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SameLocationSheet({
  marker,
  onClose,
  onSelectPost
}: {
  marker: PlaceClusterMarker | null;
  onClose: () => void;
  onSelectPost: (post: PostSummary) => void;
}) {
  const closeTriggeredRef = useRef(false);

  function consumeInteraction(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  useEffect(() => {
    if (!marker) {
      closeTriggeredRef.current = false;
    }
  }, [marker]);

  function requestClose() {
    closeTriggeredRef.current = true;
    onClose();
  }

  function handleClosePointerDown(event: SyntheticEvent) {
    consumeInteraction(event);
    requestClose();
  }

  function handleCloseClick(event: SyntheticEvent) {
    consumeInteraction(event);

    if (closeTriggeredRef.current) {
      return;
    }

    requestClose();
  }

  function handleBackdropClick(event: SyntheticEvent) {
    consumeInteraction(event);
    requestClose();
  }

  function handleSelectPost(event: SyntheticEvent, post: PostSummary) {
    consumeInteraction(event);
    onSelectPost(post);
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[995] flex items-end justify-center p-3 transition-all duration-400 ease-out will-change-[transform,opacity]",
        marker ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
    >
      {marker ? (
        <div
          aria-hidden="true"
          className="pointer-events-auto absolute inset-0 bg-black/15"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={handleBackdropClick}
        />
      ) : null}

      <div
        className="pointer-events-auto relative z-[1] glass-panel w-full max-w-2xl rounded-[2rem] p-4 shadow-2xl shadow-black/20"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {marker ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]/45">Same location</p>
                <h2 className="mt-1 font-[var(--font-serif)] text-2xl leading-tight text-[var(--foreground)]">
                  {marker.placeName}
                </h2>
                <LocationCountryText
                  city={marker.city}
                  country={marker.country}
                  className="mt-2 min-w-0 max-w-full text-sm text-[var(--foreground)]/64"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground)]/62">
                  <span className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-1.5">
                    <Layers3 className="h-3.5 w-3.5 shrink-0 text-[var(--map-accent)]" />
                    <span>
                      {marker.postCount} {marker.postCount === 1 ? "memory" : "memories"} pinned here
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                    <span>Browse each memory from this exact pin</span>
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                className="rounded-full p-2"
                onPointerDown={handleClosePointerDown}
                onClick={handleCloseClick}
                aria-label="Close same-location sheet"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {marker.visitors.length > 0 ? (
              <div className="flex -space-x-2">
                {marker.visitors.map((visitor) => (
                  <ProfileLink key={visitor.id} username={visitor.username} className="rounded-full">
                    <Avatar
                      name={visitor.name}
                      src={visitor.avatarUrl}
                      className="h-9 w-9 border-2 border-[var(--surface-strong)]"
                    />
                  </ProfileLink>
                ))}
              </div>
            ) : null}

            <div className="max-h-[min(64vh,34rem)] space-y-3 overflow-y-auto pr-1">
              {marker.posts.map((post) => {
                const primaryCaption = post.caption.trim() || `Memory from ${post.placeName}`;

                return (
                  <div key={post.id} className="rounded-[1.5rem] border bg-[var(--surface-strong)] p-3">
                    <div className="grid gap-3 sm:grid-cols-[104px_1fr]">
                      <div className="aspect-[4/3] overflow-hidden rounded-[1.25rem]">
                        <MediaView
                          mediaType={post.mediaType}
                          mediaUrl={post.mediaUrl}
                          thumbnailUrl={post.thumbnailUrl}
                          showVideoControls={false}
                        />
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <ProfileLink
                            username={post.user.username}
                            className="flex min-w-0 items-center gap-2 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-soft)]"
                          >
                            <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-8 w-8 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-[var(--foreground)]/82">{post.user.name}</p>
                              <p className="truncate text-[11px] text-[var(--foreground)]/48">@{post.user.username}</p>
                            </div>
                          </ProfileLink>
                          <span className="shrink-0 text-[11px] text-[var(--foreground)]/44">
                            <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--surface-soft)] px-2 py-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatVisitDate(post.visitedAt)}
                            </span>
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 font-[var(--font-serif)] text-base leading-snug text-[var(--foreground)]">
                          {primaryCaption}
                        </p>

                        <div className="mt-auto pt-3">
                          <Button
                            className="w-full justify-between bg-[var(--map-accent)] text-[var(--foreground)] hover:opacity-95 focus:ring-[var(--map-accent)]"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => handleSelectPost(event, post)}
                          >
                            Expand memory
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
