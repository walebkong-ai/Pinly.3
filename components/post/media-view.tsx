"use client";

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { cn, getMediaProxyUrl } from "@/lib/utils";

export const MediaView = memo(function MediaView({
  mediaType,
  mediaUrl,
  thumbnailUrl,
  className,
  postId,
  showVideoControls = true
}: {
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  className?: string;
  postId?: string;
  showVideoControls?: boolean;
}) {
  const proxyUrl = getMediaProxyUrl(mediaUrl);
  const proxyThumb = getMediaProxyUrl(thumbnailUrl);
  const [loaded, setLoaded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const hideHeartTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLoaded(false);
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
    return (
      <div className={cn("relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black/5", className)} {...interactiveProps}>
        <video
          className="h-full w-full object-cover"
          controls={showVideoControls}
          playsInline
          poster={proxyThumb || undefined}
          preload={videoPreload}
        >
          <source src={proxyUrl} />
        </video>
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
      <Image
        key={proxyUrl}
        src={proxyUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
        unoptimized={proxyUrl.startsWith("/api/media")}
      />
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-black/5" /> : null}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <Heart className="h-24 w-24 animate-in zoom-in-50 fade-in duration-300 fill-white text-white drop-shadow-2xl" />
        </div>
      )}
    </div>
  );
});
