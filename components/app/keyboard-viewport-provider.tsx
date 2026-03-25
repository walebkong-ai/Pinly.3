"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { isKeyboardEditableElement } from "@/lib/keyboard-offset";

export function KeyboardViewportProvider({
  children
}: {
  children: ReactNode;
}) {
  const [focusSequence, setFocusSequence] = useState(0);
  const {
    keyboardOffset,
    layoutViewportHeight,
    viewportHeight,
    viewportOffsetTop,
    isKeyboardOpen
  } = useKeyboardOffset();

  useEffect(() => {
    const root = document.documentElement;
    const resolvedViewportHeight = viewportHeight || layoutViewportHeight;

    root.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);
    root.style.setProperty("--visual-viewport-offset-top", `${viewportOffsetTop}px`);

    if (resolvedViewportHeight > 0) {
      root.style.setProperty("--app-viewport-height", `${resolvedViewportHeight}px`);
      root.style.setProperty("--visual-viewport-height", `${resolvedViewportHeight}px`);
    }

    root.dataset.keyboardOpen = isKeyboardOpen ? "true" : "false";
  }, [isKeyboardOpen, keyboardOffset, layoutViewportHeight, viewportHeight, viewportOffsetTop]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    if (!isKeyboardEditableElement(activeElement)) {
      return;
    }

    const timerIds = (isKeyboardOpen ? [0, 120, 260, 420] : [120, 280]).map((delay) =>
      window.setTimeout(() => {
        const currentActiveElement = document.activeElement;
        if (!(currentActiveElement instanceof HTMLElement) || !isKeyboardEditableElement(currentActiveElement)) {
          return;
        }

        const viewport = window.visualViewport;
        const viewportTop = (viewport?.offsetTop ?? 0) + 24;
        const viewportBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 24;
        const rect = currentActiveElement.getBoundingClientRect();

        if (rect.top >= viewportTop && rect.bottom <= viewportBottom) {
          return;
        }

        currentActiveElement.scrollIntoView({
          block: "center",
          inline: "nearest"
        });
      }, delay)
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [focusSequence, isKeyboardOpen, keyboardOffset, viewportHeight, viewportOffsetTop]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (isKeyboardEditableElement(event.target as Element | null)) {
        setFocusSequence((current) => current + 1);
      }
    };

    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    return () => {
      root.style.removeProperty("--keyboard-offset");
      root.style.removeProperty("--visual-viewport-offset-top");
      root.style.removeProperty("--app-viewport-height");
      root.style.removeProperty("--visual-viewport-height");
      delete root.dataset.keyboardOpen;
    };
  }, []);

  return children;
}
