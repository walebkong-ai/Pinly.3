"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart, MapPin } from "lucide-react";
import type { PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";
import { LikeButton } from "@/components/post/like-button";
import { CommentSection } from "@/components/post/comment-section";
import { ShareSheet } from "@/components/post/share-sheet";
import { SaveButton } from "@/components/post/save-button";
import { VisitedWithList } from "@/components/post/visited-with-list";
import { ProfileLink } from "@/components/profile/profile-link";
import { LocationCountryText } from "@/components/ui/country-flag";
import {
  MOBILE_TAP_MAX_MOVEMENT_PX,
  MOBILE_TAP_NAVIGATION_DELAY_MS,
  getGestureBlockingInteractiveTarget,
  isTapWithinTolerance,
  resolvePendingTapInterruption,
  resolveTouchTapAction,
  type TapPoint
} from "@/lib/post-tap-gesture";

export function PostCard({
  post,
  compact = false,
  showLikeCounts = true,
  openOnBodyTap = false
}: {
  post: PostSummary;
  compact?: boolean;
  showLikeCounts?: boolean;
  openOnBodyTap?: boolean;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);
  const touchSessionRef = useRef<{
    pointerId: number;
    pointerType: string;
    x: number;
    y: number;
    startedAt: number;
    moved: boolean;
  } | null>(null);
  const lastTouchTapRef = useRef<TapPoint | null>(null);
  const pendingNavigationRef = useRef<number | null>(null);
  const likeFeedbackTimeoutRef = useRef<number | null>(null);
  const [showDoubleTapLikeFeedback, setShowDoubleTapLikeFeedback] = useState(false);
  const commentsEnabled = post.user.settings?.commentsEnabled ?? true;
  const primaryCaption = post.caption.trim() || `Memory from ${post.placeName}`;

  useEffect(() => {
    return () => {
      clearPendingNavigation();
      clearLikeFeedback();
    };
  }, []);

  useEffect(() => {
    if (!openOnBodyTap) {
      return;
    }

    function handleGlobalPointerDown(event: globalThis.PointerEvent) {
      if (pendingNavigationRef.current === null && lastTouchTapRef.current === null) {
        return;
      }

      const target = event.target;
      const interruption = resolvePendingTapInterruption({
        targetIsSameSurface: Boolean(bodyRef.current && target instanceof Node && bodyRef.current.contains(target)),
        targetIsInteractive: isInteractiveTarget(target)
      });

      if (interruption.cancelPendingNavigation) {
        clearPendingNavigation();
      }

      if (interruption.resetTapCandidate) {
        lastTouchTapRef.current = null;
      }
    }

    function handleGlobalScroll() {
      clearPendingNavigation();
      lastTouchTapRef.current = null;
      resetTouchGesture();
    }

    window.addEventListener("pointerdown", handleGlobalPointerDown, true);
    window.addEventListener("scroll", handleGlobalScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
      window.removeEventListener("scroll", handleGlobalScroll, true);
    };
  }, [openOnBodyTap]);

  function clearPendingNavigation() {
    if (pendingNavigationRef.current !== null) {
      window.clearTimeout(pendingNavigationRef.current);
      pendingNavigationRef.current = null;
    }
  }

  function clearLikeFeedback() {
    if (likeFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(likeFeedbackTimeoutRef.current);
      likeFeedbackTimeoutRef.current = null;
    }
  }

  function triggerDoubleTapLikeFeedback() {
    clearLikeFeedback();
    setShowDoubleTapLikeFeedback(true);
    likeFeedbackTimeoutRef.current = window.setTimeout(() => {
      likeFeedbackTimeoutRef.current = null;
      setShowDoubleTapLikeFeedback(false);
    }, 520);
  }

  function openPost() {
    clearPendingNavigation();
    lastTouchTapRef.current = null;
    router.push(`/posts/${post.id}`);
  }

  function dispatchDoubleTapLike() {
    window.dispatchEvent(
      new CustomEvent(`like-post-${post.id}`, {
        detail: {
          source: "double-tap"
        }
      })
    );
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return (
      getGestureBlockingInteractiveTarget({
        target,
        gestureSurface: bodyRef.current
      }) !== null
    );
  }

  function handleBodyPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!openOnBodyTap || event.button !== 0 || isInteractiveTarget(event.target)) {
      return;
    }

    touchSessionRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      startedAt: Date.now(),
      moved: false
    };
  }

  function handleBodyPointerMove(event: PointerEvent<HTMLDivElement>) {
    const session = touchSessionRef.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    if (
      !isTapWithinTolerance(
        { x: session.x, y: session.y },
        { x: event.clientX, y: event.clientY },
        MOBILE_TAP_MAX_MOVEMENT_PX
      )
    ) {
      session.moved = true;
    }
  }

  function resetTouchGesture() {
    touchSessionRef.current = null;
  }

  function handleBodyPointerUp(event: PointerEvent<HTMLDivElement>) {
    const session = touchSessionRef.current;
    resetTouchGesture();

    if (!openOnBodyTap || !session || session.pointerId !== event.pointerId) {
      return;
    }

    if (session.pointerType === "mouse") {
      if (session.moved || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openPost();
      return;
    }

    const tapPoint = {
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };
    const tapResolution = resolveTouchTapAction({
      previousTap: lastTouchTapRef.current,
      currentTap: tapPoint,
      pointerType: session.pointerType,
      moved: session.moved,
      durationMs: tapPoint.timestamp - session.startedAt,
      isInteractiveTarget: isInteractiveTarget(event.target)
    });

    if (tapResolution.action === "ignore") {
      lastTouchTapRef.current = null;
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (tapResolution.action === "like") {
      clearPendingNavigation();
      lastTouchTapRef.current = tapResolution.nextTap;
      triggerDoubleTapLikeFeedback();
      dispatchDoubleTapLike();
      return;
    }

    lastTouchTapRef.current = tapResolution.nextTap;
    clearPendingNavigation();
    pendingNavigationRef.current = window.setTimeout(() => {
      pendingNavigationRef.current = null;
      lastTouchTapRef.current = null;
      openPost();
    }, MOBILE_TAP_NAVIGATION_DELAY_MS);
  }

  function handleBodyClick(event: MouseEvent<HTMLDivElement>) {
    if (!openOnBodyTap || isInteractiveTarget(event.target)) {
      return;
    }

    if (typeof window !== "undefined" && "PointerEvent" in window) {
      event.preventDefault();
      return;
    }

    openPost();
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!openOnBodyTap) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPost();
    }
  }

  const body = (
    <div
      ref={bodyRef}
      data-post-card-body
      className={openOnBodyTap ? "group block cursor-pointer select-none touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/50" : undefined}
      onPointerDown={handleBodyPointerDown}
      onPointerMove={handleBodyPointerMove}
      onPointerUp={handleBodyPointerUp}
      onPointerCancel={resetTouchGesture}
      onClick={handleBodyClick}
      onKeyDown={handleBodyKeyDown}
      role={openOnBodyTap ? "link" : undefined}
      tabIndex={openOnBodyTap ? 0 : undefined}
      aria-label={openOnBodyTap ? `Open ${primaryCaption}` : undefined}
    >
      <div className={compact ? "relative aspect-[4/3]" : "relative aspect-[4/3]"}>
        <MediaView
          mediaType={post.mediaType}
          mediaUrl={post.mediaUrl}
          thumbnailUrl={post.thumbnailUrl}
          postId={openOnBodyTap ? undefined : post.id}
          showVideoControls={!openOnBodyTap}
        />
        {showDoubleTapLikeFeedback ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/12 backdrop-blur-sm animate-in zoom-in-75 fade-in duration-200">
              <Heart className="h-10 w-10 fill-white text-white drop-shadow-lg" />
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <ProfileLink
            username={post.user.username}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-soft)]"
          >
            <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]/84">{post.user.name}</p>
              <p className="truncate text-[11px] text-[var(--foreground)]/50">@{post.user.username}</p>
            </div>
          </ProfileLink>
        </div>
        <div className="space-y-2.5">
          <p
            className={
              compact
                ? "line-clamp-3 font-[var(--font-serif)] text-base leading-snug text-[var(--foreground)]"
                : "line-clamp-3 font-[var(--font-serif)] text-[1.08rem] leading-snug text-[var(--foreground)]"
            }
          >
            {primaryCaption}
          </p>
          <div className="flex items-start gap-2 text-xs text-[var(--foreground)]/58 min-w-0">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--map-accent)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--foreground)]/66">{post.placeName}</p>
              <LocationCountryText city={post.city} country={post.country} className="mt-0.5 w-full min-w-0" />
            </div>
          </div>
          <VisitedWithList friends={post.visitedWith} compact />
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground)]/42">
            Visited {formatVisitDate(post.visitedAt)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-[1.75rem] border bg-[var(--surface-strong)] shadow-sm">
      {body}

      {/* Like + Comment + Share + Open */}
      <div className="flex flex-wrap items-center gap-1 border-t px-4 pb-4 pt-2">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByViewer}
          initialCount={post.likeCount}
          showCount={showLikeCounts}
        />
        {commentsEnabled ? (
          <CommentSection postId={post.id} />
        ) : (
          <span className="inline-flex items-center rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/50">
            Comments off
          </span>
        )}
        <SaveButton postId={post.id} initialSaved={post.savedByViewer} />
        <ShareSheet postId={post.id} />
        {!openOnBodyTap ? (
          <Link href={`/posts/${post.id}`} className="ml-auto text-xs font-medium text-[var(--foreground)]/72 transition hover:text-[var(--foreground)]">
            Open
          </Link>
        ) : null}
      </div>
    </article>
  );
}
