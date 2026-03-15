"use client";

import Link from "next/link";
import type { SyntheticEvent } from "react";
import { CalendarDays, MapPin, X } from "lucide-react";
import type { PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MediaView } from "@/components/post/media-view";
import { WantToGoButton } from "@/components/places/want-to-go-button";
import { formatVisitDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BottomSheet({
  post,
  onClose
}: {
  post: PostSummary | null;
  onClose: () => void;
}) {
  const caption = post?.caption.trim();
  const primaryCopy = caption?.length
    ? caption
    : post
      ? `Memory from ${post.placeName}`
      : "";

  function consumeInteraction(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleClose(event: SyntheticEvent) {
    consumeInteraction(event);
    onClose();
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[980] flex items-end justify-center p-3 transition-all duration-400 ease-out will-change-[transform,opacity]",
        post ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
    >
      {post ? (
        <div
          aria-hidden="true"
          className="pointer-events-auto absolute inset-0"
          onPointerDown={consumeInteraction}
          onClick={consumeInteraction}
        />
      ) : null}

      <div
        className="pointer-events-auto relative z-[1] glass-panel w-full max-w-3xl rounded-[2rem] p-3 shadow-2xl shadow-black/20"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {post && (
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={post.user.name} src={post.user.avatarUrl} />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]/84">{post.user.name}</p>
                    <p className="text-xs text-[var(--foreground)]/54">@{post.user.username}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full p-2"
                  onPointerDown={consumeInteraction}
                  onClick={handleClose}
                  aria-label="Close sheet"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]/42">Expanded memory</p>
                <p className="font-[var(--font-serif)] text-[1.8rem] leading-[1.14] text-[var(--foreground)] md:text-[2.35rem] md:leading-[1.1]">
                  {primaryCopy}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground)]/62">
                  <span className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--map-accent)]" />
                    <span className="min-w-0 truncate">
                      {post.placeName}, {post.city}, {post.country}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                    <span>Visited {formatVisitDate(post.visitedAt)}</span>
                  </span>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
                <WantToGoButton
                  location={post}
                  hydrateFromApi
                  triggerStyle="secondary"
                  className="w-full sm:w-auto"
                />
                <Link href={`/posts/${post.id}`} className="w-full sm:w-auto">
                  <Button className="w-full">Open full post</Button>
                </Link>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onPointerDown={consumeInteraction}
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
