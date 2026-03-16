"use client";

import Link from "next/link";
import { type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProfileLinkProps = {
  username: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  stopPropagation?: boolean;
};

export function ProfileLink({
  username,
  children,
  className,
  ariaLabel,
  stopPropagation = true
}: ProfileLinkProps) {
  function maybeStopPropagation(
    event:
      | MouseEvent<HTMLAnchorElement>
      | PointerEvent<HTMLAnchorElement>
      | KeyboardEvent<HTMLAnchorElement>
  ) {
    if (stopPropagation) {
      event.stopPropagation();
    }
  }

  return (
    <Link
      href={`/profile/${username}`}
      aria-label={ariaLabel ?? `Open @${username}'s profile`}
      className={cn(className)}
      onPointerDown={maybeStopPropagation}
      onClick={maybeStopPropagation}
      onKeyDown={maybeStopPropagation}
    >
      {children}
    </Link>
  );
}
