"use client";

import { useEffect, useState } from "react";
import { computeKeyboardViewportState, isKeyboardEditableElement } from "@/lib/keyboard-offset";

type KeyboardOffsetState = {
  baselineHeight: number;
  keyboardOffset: number;
  layoutViewportHeight: number;
  viewportHeight: number;
  viewportOffsetTop: number;
  isKeyboardOpen: boolean;
};

const DEFAULT_STATE: KeyboardOffsetState = {
  baselineHeight: 0,
  keyboardOffset: 0,
  layoutViewportHeight: 0,
  viewportHeight: 0,
  viewportOffsetTop: 0,
  isKeyboardOpen: false
};

export function useKeyboardOffset() {
  const [state, setState] = useState<KeyboardOffsetState>(DEFAULT_STATE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let baselineHeight = 0;
    let lastWidth = 0;
    let frameId = 0;
    let timerId = 0;

    const measure = () => {
      frameId = 0;

      const layoutViewportHeight = Math.max(0, Math.round(window.innerHeight));
      const layoutViewportWidth = Math.max(0, Math.round(window.innerWidth));
      const viewport = window.visualViewport;
      const viewportHeight = Math.max(0, Math.round(viewport?.height ?? layoutViewportHeight));
      const viewportOffsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0));
      const measurementBaseline = viewport ? layoutViewportHeight : baselineHeight || layoutViewportHeight;

      if (!baselineHeight || Math.abs(layoutViewportWidth - lastWidth) > 48) {
        baselineHeight = Math.max(layoutViewportHeight, viewportHeight + viewportOffsetTop);
        lastWidth = layoutViewportWidth;
      }

      const nextState = computeKeyboardViewportState({
        baselineHeight: measurementBaseline,
        layoutViewportHeight,
        visualViewportHeight: viewportHeight,
        visualViewportOffsetTop: viewportOffsetTop,
        hasEditableFocus: isKeyboardEditableElement(document.activeElement)
      });

      if (!nextState.isKeyboardOpen) {
        baselineHeight = viewport
          ? layoutViewportHeight
          : Math.max(layoutViewportHeight, viewportHeight + viewportOffsetTop);
      }

      setState((current) => {
        if (
          current.baselineHeight === nextState.baselineHeight &&
          current.keyboardOffset === nextState.keyboardOffset &&
          current.layoutViewportHeight === nextState.layoutViewportHeight &&
          current.viewportHeight === nextState.viewportHeight &&
          current.viewportOffsetTop === nextState.viewportOffsetTop &&
          current.isKeyboardOpen === nextState.isKeyboardOpen
        ) {
          return current;
        }

        return nextState;
      });
    };

    const queueMeasure = (delay = 0) => {
      window.clearTimeout(timerId);

      timerId = window.setTimeout(() => {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
        }

        frameId = window.requestAnimationFrame(measure);
      }, delay);
    };

    const viewport = window.visualViewport;
    const handleMeasure = () => {
      queueMeasure();
    };
    const handleBlur = () => {
      queueMeasure(90);
    };

    queueMeasure();
    window.addEventListener("resize", handleMeasure);
    window.addEventListener("orientationchange", handleMeasure);
    window.addEventListener("pageshow", handleMeasure);
    document.addEventListener("focusin", handleMeasure);
    document.addEventListener("focusout", handleBlur);
    document.addEventListener("visibilitychange", handleMeasure);
    viewport?.addEventListener("resize", handleMeasure);
    viewport?.addEventListener("scroll", handleMeasure);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.clearTimeout(timerId);
      window.removeEventListener("resize", handleMeasure);
      window.removeEventListener("orientationchange", handleMeasure);
      window.removeEventListener("pageshow", handleMeasure);
      document.removeEventListener("focusin", handleMeasure);
      document.removeEventListener("focusout", handleBlur);
      document.removeEventListener("visibilitychange", handleMeasure);
      viewport?.removeEventListener("resize", handleMeasure);
      viewport?.removeEventListener("scroll", handleMeasure);
    };
  }, []);

  return state;
}
