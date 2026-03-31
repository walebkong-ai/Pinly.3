export const KEYBOARD_OFFSET_THRESHOLD_PX = 72;
const MAX_KEYBOARD_OFFSET_RATIO = 0.72;

export type KeyboardViewportComputationInput = {
  baselineHeight: number;
  layoutViewportHeight: number;
  visualViewportHeight: number;
  visualViewportOffsetTop: number;
  hasEditableFocus: boolean;
};

export type KeyboardViewportComputation = {
  baselineHeight: number;
  keyboardOffset: number;
  layoutViewportHeight: number;
  viewportHeight: number;
  viewportOffsetTop: number;
  isKeyboardOpen: boolean;
};

export type KeyboardRevealComputationInput = {
  elementTop: number;
  elementBottom: number;
  viewportTop: number;
  viewportBottom: number;
  margin?: number;
};

export function isKeyboardEditableElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled;
  }

  if (element instanceof HTMLInputElement) {
    const nonTextTypes = new Set([
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit"
    ]);

    return !element.readOnly && !element.disabled && !nonTextTypes.has(element.type);
  }

  return false;
}

export function clampKeyboardOffset(rawOffset: number, baselineHeight: number) {
  if (!Number.isFinite(rawOffset) || rawOffset <= 0 || !Number.isFinite(baselineHeight) || baselineHeight <= 0) {
    return 0;
  }

  const maxOffset = Math.round(baselineHeight * MAX_KEYBOARD_OFFSET_RATIO);
  return Math.max(0, Math.min(Math.round(rawOffset), maxOffset));
}

export function computeKeyboardRevealDelta({
  elementTop,
  elementBottom,
  viewportTop,
  viewportBottom,
  margin = 16
}: KeyboardRevealComputationInput) {
  if (!Number.isFinite(elementTop) || !Number.isFinite(elementBottom) || !Number.isFinite(viewportTop) || !Number.isFinite(viewportBottom)) {
    return 0;
  }

  const safeViewportTop = viewportTop + margin;
  const safeViewportBottom = viewportBottom - margin;

  if (elementTop < safeViewportTop) {
    return Math.round(elementTop - safeViewportTop);
  }

  if (elementBottom > safeViewportBottom) {
    return Math.round(elementBottom - safeViewportBottom);
  }

  return 0;
}

export function computeKeyboardViewportState({
  baselineHeight,
  layoutViewportHeight,
  visualViewportHeight,
  visualViewportOffsetTop,
  hasEditableFocus
}: KeyboardViewportComputationInput): KeyboardViewportComputation {
  const resolvedBaseline = Math.max(
    baselineHeight || 0,
    layoutViewportHeight || 0,
    (visualViewportHeight || 0) + (visualViewportOffsetTop || 0)
  );
  const rawOffset = resolvedBaseline - visualViewportHeight - visualViewportOffsetTop;
  const keyboardOffset = clampKeyboardOffset(rawOffset, resolvedBaseline);
  const isKeyboardOpen = hasEditableFocus && keyboardOffset >= KEYBOARD_OFFSET_THRESHOLD_PX;

  return {
    baselineHeight: resolvedBaseline,
    keyboardOffset: isKeyboardOpen ? keyboardOffset : 0,
    layoutViewportHeight,
    viewportHeight: visualViewportHeight,
    viewportOffsetTop: visualViewportOffsetTop,
    isKeyboardOpen
  };
}
