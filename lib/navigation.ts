export function canUseHistoryBack(
  historyLength: number,
  referrer: string | null | undefined,
  locationOrigin: string
) {
  if (historyLength <= 1 || !referrer) {
    return false;
  }

  try {
    return new URL(referrer).origin === locationOrigin;
  } catch {
    return false;
  }
}
