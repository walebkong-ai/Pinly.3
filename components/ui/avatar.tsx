"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn, getProfileImageUrl } from "@/lib/utils";

const failedAvatarUrls = new Set<string>();

export function Avatar({
  name,
  src,
  className
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const normalizedUrl = getProfileImageUrl(src);
  const [imageFailed, setImageFailed] = useState(() => (normalizedUrl ? failedAvatarUrls.has(normalizedUrl) : false));

  useEffect(() => {
    setImageFailed(normalizedUrl ? failedAvatarUrls.has(normalizedUrl) : false);
  }, [normalizedUrl]);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    console.info("[avatar] Resolved avatar URL", {
      name,
      rawAvatarUrl: src ?? null,
      resolvedAvatarUrl: normalizedUrl || null
    });
  }, [name, normalizedUrl, src]);

  const imageUrl = imageFailed ? "" : normalizedUrl;

  if (imageUrl) {
    return (
      <div className={cn("relative h-10 w-10 overflow-hidden rounded-full border bg-[var(--surface-strong)]", className)}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          onError={() => {
            failedAvatarUrls.add(imageUrl);
            console.error("[avatar] Avatar failed to load", {
              name,
              resolvedAvatarUrl: imageUrl
            });
            setImageFailed(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--map-accent-soft)] text-sm font-semibold uppercase text-[var(--foreground)]",
        className
      )}
    >
      {name.slice(0, 2)}
    </div>
  );
}
