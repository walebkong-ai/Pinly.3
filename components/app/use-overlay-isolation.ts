"use client";

import { useEffect, useRef } from "react";

type OverlayIsolationOptions = {
  scopeName: string;
  inertTargetSelector?: string;
};

type OverlayLockSnapshot = {
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyTouchAction: string;
  bodyPaddingRight: string;
  overlayTarget: (HTMLElement & { inert?: boolean }) | null;
  overlayTargetAriaHidden: string | null;
  overlayTargetInert: boolean;
};

const activeOverlayScopes = new Map<string, string>();
let overlayLockSnapshot: OverlayLockSnapshot | null = null;

function syncOverlayDatasets(root: HTMLElement) {
  if (activeOverlayScopes.size > 0) {
    root.dataset.pinlyOverlayOpen = "true";
  } else {
    delete root.dataset.pinlyOverlayOpen;
  }

  const sidebarOpen = Array.from(activeOverlayScopes.values()).includes("sidebar");

  if (sidebarOpen) {
    root.dataset.pinlySidebarOpen = "true";
  } else {
    delete root.dataset.pinlySidebarOpen;
  }
}

function acquireOverlayLock(token: string, scopeName: string, inertTargetSelector: string) {
  const root = document.documentElement;
  const body = document.body;

  if (!overlayLockSnapshot) {
    const overlayTarget = document.querySelector<HTMLElement>(inertTargetSelector) as
      | (HTMLElement & { inert?: boolean })
      | null;
    const computedBodyStyle = window.getComputedStyle(body);
    const scrollbarCompensation = Math.max(0, window.innerWidth - root.clientWidth);

    overlayLockSnapshot = {
      htmlOverflow: root.style.overflow,
      htmlOverscrollBehavior: root.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
      bodyPaddingRight: body.style.paddingRight,
      overlayTarget,
      overlayTargetAriaHidden: overlayTarget?.getAttribute("aria-hidden") ?? null,
      overlayTargetInert: Boolean(overlayTarget?.inert)
    };

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";

    if (scrollbarCompensation > 0) {
      body.style.paddingRight = `calc(${computedBodyStyle.paddingRight} + ${scrollbarCompensation}px)`;
    }

    if (overlayTarget) {
      overlayTarget.setAttribute("aria-hidden", "true");
      overlayTarget.inert = true;
    }
  }

  activeOverlayScopes.set(token, scopeName);
  syncOverlayDatasets(root);
}

function releaseOverlayLock(token: string) {
  activeOverlayScopes.delete(token);

  const root = document.documentElement;
  syncOverlayDatasets(root);

  if (activeOverlayScopes.size > 0 || !overlayLockSnapshot) {
    return;
  }

  root.style.overflow = overlayLockSnapshot.htmlOverflow;
  root.style.overscrollBehavior = overlayLockSnapshot.htmlOverscrollBehavior;

  document.body.style.overflow = overlayLockSnapshot.bodyOverflow;
  document.body.style.overscrollBehavior = overlayLockSnapshot.bodyOverscrollBehavior;
  document.body.style.touchAction = overlayLockSnapshot.bodyTouchAction;
  document.body.style.paddingRight = overlayLockSnapshot.bodyPaddingRight;

  if (overlayLockSnapshot.overlayTarget) {
    if (overlayLockSnapshot.overlayTargetAriaHidden === null) {
      overlayLockSnapshot.overlayTarget.removeAttribute("aria-hidden");
    } else {
      overlayLockSnapshot.overlayTarget.setAttribute("aria-hidden", overlayLockSnapshot.overlayTargetAriaHidden);
    }

    overlayLockSnapshot.overlayTarget.inert = overlayLockSnapshot.overlayTargetInert;
  }

  overlayLockSnapshot = null;
}

export function useOverlayIsolation(
  active: boolean,
  { scopeName, inertTargetSelector = "[data-pinly-app-shell='true']" }: OverlayIsolationOptions
) {
  const tokenRef = useRef(`overlay-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!active || typeof document === "undefined") {
      return;
    }

    acquireOverlayLock(tokenRef.current, scopeName, inertTargetSelector);

    return () => {
      releaseOverlayLock(tokenRef.current);
    };
  }, [active, inertTargetSelector, scopeName]);
}
