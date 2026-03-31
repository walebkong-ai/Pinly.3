"use client";

import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type RevealImageProps = ImageProps & {
  wrapperClassName?: string;
  skeletonClassName?: string;
  fallback?: ReactNode;
};

export function RevealImage({
  wrapperClassName,
  skeletonClassName,
  fallback,
  className,
  onLoad,
  onError,
  src,
  alt,
  ...props
}: RevealImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && !failed ? (
        <div
          className={cn("pinly-skeleton absolute inset-0 z-[1]", skeletonClassName)}
          aria-hidden="true"
        />
      ) : null}
      {failed ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[var(--surface-soft)] text-[var(--foreground)]/45">
          {fallback ?? <ImageOff className="h-5 w-5" />}
        </div>
      ) : null}
      <Image
        src={src}
        alt={alt}
        className={cn(
          "object-cover transition-[opacity,transform] duration-300 ease-out",
          loaded && !failed ? "scale-100 opacity-100" : "scale-[1.02] opacity-0",
          className
        )}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
        {...props}
      />
    </div>
  );
}
