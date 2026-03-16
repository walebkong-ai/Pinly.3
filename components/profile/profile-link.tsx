"use client";

import React from "react";
import Link from "next/link";
import { cloneElement, isValidElement, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProfileLinkProps = {
  username: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  stopPropagation?: boolean;
  disableProfileNavigation?: boolean;
};

export function ProfileLink({
  username,
  children,
  className,
  ariaLabel,
  stopPropagation = true,
  disableProfileNavigation = false
}: ProfileLinkProps) {
  if (disableProfileNavigation) {
    if (className && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;

      return cloneElement(child, {
        className: cn(child.props.className, className)
      });
    }

    if (className) {
      return <div className={cn(className)}>{children}</div>;
    }
    return <>{children}</>;
  }

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
