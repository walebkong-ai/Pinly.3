"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import { cn, getMediaProxyUrl } from "@/lib/utils";

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
  const proxyUrl = getMediaProxyUrl(mediaUrl);
  const proxyThumb = getMediaProxyUrl(thumbnailUrl);
  const previewUrl = proxyThumb && proxyThumb !== proxyUrl ? proxyThumb : "";
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const hideHeartTimeoutRef = useRef<number | null>(null);
  const imageSizes = "(max-width: 768px) 100vw, 50vw";

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    lastTapRef.current = 0;
    setShowHeart(false);

    if (hideHeartTimeoutRef.current !== null) {
      window.clearTimeout(hideHeartTimeoutRef.current);
      hideHeartTimeoutRef.current = null;
    }
  }, [mediaType, postId, proxyThumb, proxyUrl]);

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
    if (!proxyUrl) {
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
          poster={proxyThumb || undefined}
          preload={videoPreload}
          onError={() => setFailed(true)}
        >
          <source src={proxyUrl} />
        </video>
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

  if (!proxyUrl || failed) {
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
      {previewUrl ? (
        <Image
          key={previewUrl}
          src={previewUrl}
          alt=""
          fill
          sizes={imageSizes}
          className={cn(
            "object-cover transition-[opacity,transform,filter] duration-500 ease-out",
            loaded ? "scale-[1.04] opacity-0 blur-md" : "scale-100 opacity-100 blur-0"
          )}
          onError={() => setLoaded(true)}
        />
      ) : null}
      <Image
        key={proxyUrl}
        src={proxyUrl}
        alt=""
        fill
        sizes={imageSizes}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={cn(
          "object-cover transition-[opacity,transform,filter] duration-500 ease-out will-change-[opacity,transform,filter]",
          loaded ? "scale-100 opacity-100 blur-0" : previewUrl ? "scale-[1.01] opacity-0 blur-sm" : "scale-[1.02] opacity-0 blur-md"
        )}
      />
      {!loaded && !previewUrl ? (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(15,116,108,0.08),rgba(252,236,218,0.55),rgba(15,116,108,0.12))]" />
      ) : null}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <Heart className="h-24 w-24 animate-in zoom-in-50 fade-in duration-300 fill-white text-white drop-shadow-2xl" />
        </div>
      )}
    </div>
  );
});
