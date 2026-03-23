"use client";

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
  const variant = getTransitionVariant(pathname);

  return (
    <div
      key={pathname}
      className={cn(
        "pinly-screen-transition",
        variant === "detail" ? "pinly-screen-transition--detail" : "pinly-screen-transition--screen"
      )}
    >
      {children}
    </div>
  );
}
