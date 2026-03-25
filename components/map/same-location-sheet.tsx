"use client";

import { useRef, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowLeft, CalendarDays, Layers3, MapPin, X } from "lucide-react";
import type { PlaceClusterMarker, PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LocationCountryText } from "@/components/ui/country-flag";
import { MediaView } from "@/components/post/media-view";
import { ProfileLink } from "@/components/profile/profile-link";
import { formatVisitDate } from "@/lib/utils";

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
  const layerStyle = {
    "--pinly-layer-gap": "0.5rem",
    "--pinly-sheet-top-gap": "5rem",
    "--pinly-sheet-scroll-gap": "1rem"
  } as CSSProperties;

  if (!marker) {
    return null;
  }

  function consumeInteraction(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

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

  function handleBack(event: SyntheticEvent) {
    consumeInteraction(event);
    requestClose();
  }

  return (
    <div
      className="pinly-bottom-layer pointer-events-none fixed inset-0 z-[995] isolate flex items-end justify-center px-2 pt-16 sm:px-3 sm:pt-3"
      style={layerStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-0 bg-[rgba(8,17,26,0.28)] backdrop-blur-[2px]"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={handleBackdropClick}
      />

      <div
        className="pinly-bottom-surface pointer-events-auto relative z-[1] isolate flex w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border bg-[var(--card)] shadow-2xl shadow-black/20 sm:max-h-[min(84vh,46rem)]"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <>
          <div className="sticky top-0 z-[2] border-b border-[var(--foreground)]/8 bg-[var(--card)]/96 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--foreground)]/14" />
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="h-11 gap-2 rounded-full border bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-soft)]"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to map
              </Button>
              <Button
                variant="ghost"
                className="hidden h-11 w-11 rounded-full border bg-[var(--surface-strong)] p-0 text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-soft)] sm:inline-flex"
                onPointerDown={handleClosePointerDown}
                onClick={handleCloseClick}
                aria-label="Close same-location sheet"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]/45">Same pin</p>
              <h2 className="mt-1 font-[var(--font-serif)] text-[1.8rem] leading-tight text-[var(--foreground)] sm:text-2xl">
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
                  <span>Choose a memory from this exact pin</span>
                </span>
              </div>
            </div>

            {marker.visitors.length > 0 ? (
              <div className="mt-4 flex items-center gap-3">
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
                <p className="text-xs text-[var(--foreground)]/54">
                  Shared by {marker.visitors.length} {marker.visitors.length === 1 ? "traveler" : "travelers"}
                </p>
              </div>
            ) : null}
          </div>

          <div className="pinly-sheet-scroll space-y-3 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-5">
            {marker.posts.map((post, index) => {
              const primaryCaption = post.caption.trim() || `Memory from ${post.placeName}`;

              return (
                <div
                  key={post.id}
                  className="rounded-[1.5rem] border bg-[var(--surface-strong)] p-3.5 shadow-[0_14px_30px_rgba(24,85,56,0.06)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--foreground)]/52">
                    <span className="inline-flex items-center rounded-full border bg-[var(--surface-soft)] px-2.5 py-1 font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/56">
                      Memory {index + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--surface-soft)] px-2.5 py-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatVisitDate(post.visitedAt)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <div className="relative isolate aspect-[16/10] overflow-hidden rounded-[1.25rem] sm:aspect-[4/3]">
                      <MediaView
                        mediaType={post.mediaType}
                        mediaUrl={post.mediaUrl}
                        thumbnailUrl={post.thumbnailUrl}
                        showVideoControls={false}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col">
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

                      <p className="mt-3 line-clamp-2 font-[var(--font-serif)] text-base leading-snug text-[var(--foreground)]">
                        {primaryCaption}
                      </p>

                      <div className="mt-auto pt-3">
                        <Button
                          className="min-h-11 w-full justify-between bg-[var(--map-accent)] text-[var(--foreground)] hover:opacity-95 focus:ring-[var(--map-accent)]"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => handleSelectPost(event, post)}
                        >
                          Open memory
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      </div>
    </div>
  );
}
