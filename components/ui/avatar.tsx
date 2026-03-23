"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn, getProfileImageUrl } from "@/lib/utils";

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
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [normalizedUrl]);

  const imageUrl = imageFailed ? "" : normalizedUrl;

  if (imageUrl) {
    return (
      <div className={cn("relative h-10 w-10 overflow-hidden rounded-full border bg-[var(--surface-strong)]", className)}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          onError={() => setImageFailed(true)}
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
