import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativePlatform } from "@/lib/native-platform";

async function runHaptic(callback: () => Promise<void>) {
  if (!isNativePlatform()) {
    return;
  }

  try {
    await callback();
  } catch {
    // Keep interactions usable when the native plugin is unavailable.
  }
}

export function triggerLightImpact() {
  return runHaptic(() => Haptics.impact({ style: ImpactStyle.Light }));
}

export function triggerMediumImpact() {
  return runHaptic(() => Haptics.impact({ style: ImpactStyle.Medium }));
}

export function triggerSuccessHaptic() {
  return runHaptic(() => Haptics.notification({ type: NotificationType.Success }));
}

export function triggerWarningHaptic() {
  return runHaptic(() => Haptics.notification({ type: NotificationType.Warning }));
}
