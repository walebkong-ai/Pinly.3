"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, getMediaProxyUrl } from "@/lib/utils";

export function MediaView({
  mediaType,
  mediaUrl,
  thumbnailUrl,
  className
}: {
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  const proxyUrl = getMediaProxyUrl(mediaUrl);
  const proxyThumb = getMediaProxyUrl(thumbnailUrl);
  const [loaded, setLoaded] = useState(false);

  if (mediaType === "VIDEO") {
    return (
      <video
        className={cn("h-full w-full rounded-[1.5rem] object-cover", className)}
        controls
        poster={proxyThumb || undefined}
        preload="metadata"
      >
        <source src={proxyUrl} />
      </video>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-[1.5rem] bg-black/5", className)}>
      <Image 
        src={proxyUrl} 
        alt="" 
        fill 
        onLoad={() => setLoaded(true)}
        className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0")}
        unoptimized={proxyUrl.startsWith("/api/media")}
      />
    </div>
  );
}
