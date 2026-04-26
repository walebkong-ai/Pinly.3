"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMediaViewUrls } from "@/lib/post-media";

const warnedMediaIssues = new Set<string>();

function warnMediaIssue({
  kind,
  mediaType,
  mediaUrl,
  postId,
  primarySource,
  primaryUrl,
  thumbnailUrl
}: {
  kind: "primary-missing" | "primary-failed" | "thumbnail-failed";
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  postId?: string;
  primarySource: "media" | "thumbnail" | null;
  primaryUrl: string;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const warningKey = JSON.stringify({
    kind,
    mediaType,
    mediaUrl,
    thumbnailUrl,
    postId,
    primarySource,
    primaryUrl
  });

  if (warnedMediaIssues.has(warningKey)) {
    return;
  }

  warnedMediaIssues.add(warningKey);
  console.warn("[media-view] Post media could not render cleanly", {
    kind,
    mediaType,
    postId: postId ?? null,
    mediaUrl,
    thumbnailUrl: thumbnailUrl ?? null,
    primarySource,
    primaryUrl: primaryUrl || null
  });
}

export const MediaView = memo(function MediaView({
  mediaType,
  mediaUrl,
  thumbnailUrl,
  className,
  postId,
  showVideoControls = true,
  priority = false
}: {
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  className?: string;
  postId?: string;
  showVideoControls?: boolean;
  priority?: boolean;
}) {
  const { posterUrl, previewUrl, primarySource, primaryUrl } = resolveMediaViewUrls({
    mediaType,
    mediaUrl,
    thumbnailUrl
  });
  const [loaded, setLoaded] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(() => !previewUrl);
  const [failed, setFailed] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const hideHeartTimeoutRef = useRef<number | null>(null);
  const imageSizes = "(max-width: 768px) 100vw, 50vw";
  const effectivePreviewUrl = !previewFailed && previewUrl ? previewUrl : "";

  useEffect(() => {
    setLoaded(false);
    setPreviewFailed(false);
    setPreviewLoaded(!previewUrl);
    setFailed(false);
    lastTapRef.current = 0;
    setShowHeart(false);

    if (hideHeartTimeoutRef.current !== null) {
      window.clearTimeout(hideHeartTimeoutRef.current);
      hideHeartTimeoutRef.current = null;
    }
  }, [mediaType, postId, previewUrl, primaryUrl]);

  useEffect(() => {
    if (!primaryUrl) {
      warnMediaIssue({
        kind: "primary-missing",
        mediaType,
        mediaUrl,
        thumbnailUrl,
        postId,
        primarySource,
        primaryUrl
      });
    }
  }, [mediaType, mediaUrl, postId, primarySource, primaryUrl, thumbnailUrl]);

  useEffect(() => {
    return () => {
      if (hideHeartTimeoutRef.current !== null) {
        window.clearTimeout(hideHeartTimeoutRef.current);
      }
    };
  }, []);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!postId) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(`like-post-${postId}`));
      setShowHeart(true);

      if (hideHeartTimeoutRef.current !== null) {
        window.clearTimeout(hideHeartTimeoutRef.current);
      }

      hideHeartTimeoutRef.current = window.setTimeout(() => {
        hideHeartTimeoutRef.current = null;
        setShowHeart(false);
      }, 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const gestureLikeEnabled = Boolean(postId) && (mediaType === "IMAGE" || !showVideoControls);
  const interactiveProps = gestureLikeEnabled ? { onClick: handleInteraction } : {};
  const videoPreload = showVideoControls ? "metadata" : "none";

  if (mediaType === "VIDEO") {
    if (!primaryUrl) {
      return (
        <div className={cn("relative flex h-full w-full items-center justify-center rounded-[1.5rem] bg-[var(--surface-soft)]", className)}>
          <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground)]/56">
            <ImageOff className="h-8 w-8" />
            <span className="text-sm font-medium">Video unavailable</span>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black/5", className)} {...interactiveProps}>
        <video
          className="h-full w-full object-cover"
          controls={showVideoControls}
          playsInline
          poster={posterUrl || undefined}
          preload={videoPreload}
          onLoadedData={() => setLoaded(true)}
          onError={() => {
            warnMediaIssue({
              kind: "primary-failed",
              mediaType,
              mediaUrl,
              thumbnailUrl,
              postId,
              primarySource,
              primaryUrl
            });
            setFailed(true);
            setLoaded(true);
          }}
        >
          <source src={primaryUrl} />
        </video>
        {!loaded && !failed ? (
          <div className="pinly-skeleton absolute inset-0" />
        ) : null}
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-soft)]">
            <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground)]/56">
              <ImageOff className="h-8 w-8" />
              <span className="text-sm font-medium">Video unavailable</span>
            </div>
          </div>
        ) : null}
        {showHeart && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
            <Heart className="h-24 w-24 animate-in zoom-in-50 fade-in duration-300 fill-white text-white drop-shadow-2xl" />
          </div>
        )}
      </div>
    );
  }

  if (!primaryUrl || failed) {
    return (
      <div className={cn("relative flex h-full w-full items-center justify-center rounded-[1.5rem] bg-[var(--surface-soft)]", className)} {...interactiveProps}>
        <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground)]/56">
          <ImageOff className="h-8 w-8" />
          <span className="text-sm font-medium">Image unavailable</span>
        </div>
        {showHeart && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
            <Heart className="h-24 w-24 animate-in zoom-in-50 fade-in duration-300 fill-white text-white drop-shadow-2xl" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black/5", className)} {...interactiveProps}>
      {effectivePreviewUrl ? (
        <Image
          src={effectivePreviewUrl}
          alt=""
          fill
          sizes={imageSizes}
          className={cn(
            "object-cover transition-[opacity,transform,filter] duration-300 ease-out",
            loaded ? "scale-[1.02] opacity-0 blur-sm" : previewLoaded ? "scale-100 opacity-100 blur-0" : "scale-[1.01] opacity-0 blur-sm"
          )}
          onLoad={() => setPreviewLoaded(true)}
          onError={() => {
            warnMediaIssue({
              kind: "thumbnail-failed",
              mediaType,
              mediaUrl,
              thumbnailUrl,
              postId,
              primarySource,
              primaryUrl
            });
            setPreviewFailed(true);
            setPreviewLoaded(true);
          }}
        />
      ) : null}
      <Image
        src={primaryUrl}
        alt=""
        fill
        sizes={imageSizes}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => {
          warnMediaIssue({
            kind: "primary-failed",
            mediaType,
            mediaUrl,
            thumbnailUrl,
            postId,
            primarySource,
            primaryUrl
          });
          setFailed(true);
          setLoaded(true);
        }}
        className={cn(
          "object-cover transition-[opacity,transform,filter] duration-300 ease-out will-change-[opacity,transform,filter]",
          loaded ? "scale-100 opacity-100 blur-0" : previewLoaded ? "scale-[1.005] opacity-0 blur-[2px]" : "scale-[1.015] opacity-0 blur-sm"
        )}
      />
      {!loaded ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
            previewLoaded ? "opacity-0" : "opacity-100"
          )}
          aria-hidden="true"
        >
          <div className="pinly-skeleton absolute inset-0 rounded-[inherit]" />
        </div>
      ) : null}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <Heart className="h-24 w-24 animate-in zoom-in-50 fade-in duration-300 fill-white text-white drop-shadow-2xl" />
        </div>
      )}
    </div>
  );
});
