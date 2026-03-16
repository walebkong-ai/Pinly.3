export function canUseHistoryBack(
  historyLength: number,
  referrer: string | null | undefined,
  locationOrigin: string,
  historyState?: unknown
) {
  const historyIndex =
    historyState &&
    typeof historyState === "object" &&
    "idx" in historyState &&
    typeof (historyState as { idx?: unknown }).idx === "number"
      ? (historyState as { idx: number }).idx
      : null;

  if (historyIndex !== null) {
    return historyIndex > 0;
  }

  if (historyLength <= 1 || !referrer) {
    return false;
  }

  try {
    return new URL(referrer).origin === locationOrigin;
  } catch {
    return false;
  }
}
