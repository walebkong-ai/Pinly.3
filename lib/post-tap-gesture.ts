export const MOBILE_DOUBLE_TAP_MAX_DELAY_MS = 240;
export const MOBILE_TAP_NAVIGATION_DELAY_MS = MOBILE_DOUBLE_TAP_MAX_DELAY_MS;
export const MOBILE_TAP_MAX_MOVEMENT_PX = 12;
export const MOBILE_TAP_MAX_DURATION_MS = 280;
export const MOBILE_DOUBLE_TAP_TOLERANCE_PX = 28;

export type TapPoint = {
  x: number;
  y: number;
  timestamp: number;
};

export type TouchTapResolution = {
  action: "ignore" | "queue-open" | "like";
  nextTap: TapPoint | null;
  suppressClick: boolean;
};

export type PendingTapInterruption = {
  cancelPendingNavigation: boolean;
  resetTapCandidate: boolean;
};

export function isTapWithinTolerance(
  start: Pick<TapPoint, "x" | "y">,
  end: Pick<TapPoint, "x" | "y">,
  maxDistancePx = MOBILE_TAP_MAX_MOVEMENT_PX
) {
  return Math.hypot(end.x - start.x, end.y - start.y) <= maxDistancePx;
}

export function isDoubleTapCandidate(
  previousTap: TapPoint | null,
  nextTap: TapPoint,
  maxDelayMs = MOBILE_TAP_NAVIGATION_DELAY_MS,
  maxDistancePx = MOBILE_DOUBLE_TAP_TOLERANCE_PX
) {
  if (!previousTap) {
    return false;
  }

  return (
    nextTap.timestamp - previousTap.timestamp <= maxDelayMs &&
    isTapWithinTolerance(previousTap, nextTap, maxDistancePx)
  );
}

export function resolveTouchTapAction({
  previousTap,
  currentTap,
  pointerType,
  moved,
  durationMs,
  isInteractiveTarget
}: {
  previousTap: TapPoint | null;
  currentTap: TapPoint;
  pointerType: string;
  moved: boolean;
  durationMs: number;
  isInteractiveTarget: boolean;
}): TouchTapResolution {
  if (
    pointerType === "mouse" ||
    moved ||
    isInteractiveTarget ||
    durationMs > MOBILE_TAP_MAX_DURATION_MS
  ) {
    return {
      action: "ignore",
      nextTap: null,
      suppressClick: false
    };
  }

  if (isDoubleTapCandidate(previousTap, currentTap)) {
    return {
      action: "like",
      nextTap: null,
      suppressClick: true
    };
  }

  return {
    action: "queue-open",
    nextTap: currentTap,
    suppressClick: true
  };
}

export function resolvePendingTapInterruption({
  targetIsSameSurface,
  targetIsInteractive
}: {
  targetIsSameSurface: boolean;
  targetIsInteractive: boolean;
}): PendingTapInterruption {
  if (targetIsInteractive) {
    return {
      cancelPendingNavigation: true,
      resetTapCandidate: true
    };
  }

  return {
    cancelPendingNavigation: true,
    resetTapCandidate: !targetIsSameSurface
  };
}

export function shouldDispatchGestureLike({
  isLiked,
  isPending
}: {
  isLiked: boolean;
  isPending: boolean;
}) {
  return !isLiked && !isPending;
}
