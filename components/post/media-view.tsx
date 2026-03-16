"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { cn, getMediaProxyUrl } from "@/lib/utils";

export function MediaView({
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
  const [lastTap, setLastTap] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!postId) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(`like-post-${postId}`));
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  const interactiveProps = postId ? { onClick: handleInteraction } : {};

  if (mediaType === "VIDEO") {
    return (
      <div className={cn("relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black/5", className)} {...interactiveProps}>
        <video
          className="h-full w-full object-cover"
          controls={showVideoControls}
          playsInline
          poster={proxyThumb || undefined}
          preload="metadata"
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
        src={proxyUrl} 
        alt="" 
        fill 
        onLoad={() => setLoaded(true)}
        className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
        unoptimized={proxyUrl.startsWith("/api/media")}
      />
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <Heart className="h-24 w-24 animate-in zoom-in-50 fade-in duration-300 fill-white text-white drop-shadow-2xl" />
        </div>
      )}
    </div>
  );
}
