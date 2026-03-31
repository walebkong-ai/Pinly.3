"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type RevealImageProps = ImageProps & {
  wrapperClassName?: string;
  skeletonClassName?: string;
};

export function RevealImage({
  wrapperClassName,
  skeletonClassName,
  className,
  onLoad,
  src,
  alt,
  ...props
}: RevealImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded ? (
        <div
          className={cn("pinly-skeleton absolute inset-0 z-[1]", skeletonClassName)}
          aria-hidden="true"
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        className={cn(
          "object-cover transition-[opacity,transform] duration-300 ease-out",
          loaded ? "scale-100 opacity-100" : "scale-[1.02] opacity-0",
          className
        )}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        {...props}
      />
    </div>
  );
}
