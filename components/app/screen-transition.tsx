"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function getTransitionVariant(pathname: string) {
  if (
    pathname.startsWith("/posts/") ||
    pathname.startsWith("/messages/") ||
    pathname.startsWith("/collections/") ||
    pathname.startsWith("/profile/")
  ) {
    return "detail";
  }

  return "screen";
}

export function ScreenTransition({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [transitionsReady, setTransitionsReady] = useState(false);
  const variant = getTransitionVariant(pathname);

  useEffect(() => {
    setTransitionsReady(false);
    const frameId = window.requestAnimationFrame(() => {
      setTransitionsReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "pinly-screen-transition",
        transitionsReady && (variant === "detail" ? "pinly-screen-transition--detail" : "pinly-screen-transition--screen")
      )}
    >
      {children}
    </div>
  );
}
