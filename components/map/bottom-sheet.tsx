"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowLeft, CalendarDays, MapPin, X } from "lucide-react";
import type { PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LocationCountryText } from "@/components/ui/country-flag";
import { MediaView } from "@/components/post/media-view";
import { ProfileLink } from "@/components/profile/profile-link";
import { buildPostLocationMapHref } from "@/lib/map-post-navigation";
import { formatVisitDate } from "@/lib/utils";

export function BottomSheet({
  post,
  onBack,
  backLabel = "Back",
  onClose
}: {
  post: PostSummary | null;
  onBack?: () => void;
  backLabel?: string;
  onClose: () => void;
}) {
  const closeTriggeredRef = useRef(false);
  const caption = post?.caption.trim();
  const primaryCopy = caption?.length
    ? caption
    : post
      ? `Memory from ${post.placeName}`
      : "";
  const layerStyle = {
    "--pinly-layer-gap": "0.5rem",
    "--pinly-sheet-top-gap": "5rem",
    "--pinly-sheet-scroll-gap": "0.75rem"
  } as CSSProperties;

  if (!post) {
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

  function handleBack(event: SyntheticEvent) {
    consumeInteraction(event);
    onBack?.();
  }

  return (
    <div
      className="pinly-bottom-layer pointer-events-none fixed inset-0 z-[990] isolate flex items-end justify-center px-2 pt-16 sm:px-3 sm:pt-3"
      style={layerStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-0 bg-[rgba(8,17,26,0.22)] backdrop-blur-[2px]"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={handleBackdropClick}
      />

      <div
        className="pinly-bottom-surface pointer-events-auto relative z-[1] isolate flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border bg-[var(--card)] shadow-2xl shadow-black/20 sm:max-h-[min(84vh,46rem)]"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <>
          <div className="sticky top-0 z-[2] border-b border-[var(--foreground)]/8 bg-[var(--card)]/96 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--foreground)]/14" />
            <div className="flex items-center justify-between gap-3">
              {onBack ? (
                <Button
                  variant="ghost"
                  className="h-11 gap-2 rounded-full border bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-soft)]"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
              ) : (
                <div />
              )}
              <Button
                variant="ghost"
                className="h-11 w-11 rounded-full border bg-[var(--surface-strong)] p-0 text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-soft)]"
                onPointerDown={handleClosePointerDown}
                onClick={handleCloseClick}
                aria-label="Close sheet"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="pinly-sheet-scroll overflow-y-auto overscroll-contain px-3 pt-3 sm:px-4">
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <ProfileLink
                    username={post.user.username}
                    className="flex min-w-0 items-center gap-3 rounded-[1.25rem] p-1 -m-1 transition hover:bg-[var(--surface-soft)]"
                  >
                    <Avatar name={post.user.name} src={post.user.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]/84">{post.user.name}</p>
                      <p className="truncate text-xs text-[var(--foreground)]/54">@{post.user.username}</p>
                    </div>
                  </ProfileLink>
                </div>

                <div className="mt-5 space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]/42">Expanded memory</p>
                  <p className="font-[var(--font-serif)] text-[1.8rem] leading-[1.14] text-[var(--foreground)] md:text-[2.35rem] md:leading-[1.1]">
                    {primaryCopy}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground)]/62">
                    <Link
                      href={buildPostLocationMapHref(post)}
                      scroll={false}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-1.5 transition hover:bg-[var(--foreground)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/35"
                      aria-label={`Focus ${post.placeName} on the map`}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--map-accent)]" />
                      <span className="flex min-w-0 max-w-full items-center gap-1">
                        <span className="truncate">{post.placeName},</span>
                        <LocationCountryText city={post.city} country={post.country} className="min-w-0 max-w-full" />
                      </span>
                    </Link>
                    <span className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                      <span>Visited {formatVisitDate(post.visitedAt)}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
                  <Link href={`/posts/${post.id}`} className="w-full sm:w-auto">
                    <Button className="w-full bg-[var(--map-accent)] text-[var(--foreground)] hover:opacity-95 focus:ring-[var(--map-accent)]">
                      Open full post
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="w-full sm:w-auto"
                    onPointerDown={handleClosePointerDown}
                    onClick={handleCloseClick}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
