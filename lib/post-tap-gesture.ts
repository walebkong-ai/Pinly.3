export const MOBILE_TAP_NAVIGATION_DELAY_MS = 280;
export const MOBILE_TAP_MAX_MOVEMENT_PX = 10;
export const MOBILE_TAP_MAX_DURATION_MS = 320;
export const MOBILE_DOUBLE_TAP_TOLERANCE_PX = 28;

export type TapPoint = {
  x: number;
  y: number;
  timestamp: number;
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
