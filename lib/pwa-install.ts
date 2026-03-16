export type InstallPlatform = "ios-safari" | "ios-browser" | "android" | "desktop";

export function detectInstallPlatform(userAgent: string): InstallPlatform {
  const normalizedUserAgent = userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(normalizedUserAgent);
  const isAndroid = normalizedUserAgent.includes("android");
  const isSafari = normalizedUserAgent.includes("safari");
  const isExcludedIOSBrowser = /crios|fxios|edgios|opr\//.test(normalizedUserAgent);

  if (isIOS) {
    return isSafari && !isExcludedIOSBrowser ? "ios-safari" : "ios-browser";
  }

  if (isAndroid) {
    return "android";
  }

  return "desktop";
}

export function isStandaloneLike(
  displayModeStandalone: boolean,
  navigatorStandalone?: boolean
) {
  return displayModeStandalone || navigatorStandalone === true;
}

export function getInstallInstructions(platform: InstallPlatform) {
  switch (platform) {
    case "ios-safari":
      return {
        summary: "On iPhone Safari, Pinly is added from the Share menu instead of a browser install prompt.",
        steps: [
          "Tap the Share button in Safari.",
          "Choose Add to Home Screen.",
          "Tap Add to place Pinly on your Home Screen."
        ]
      };
    case "ios-browser":
      return {
        summary: "On iPhone, adding Pinly works best from Safari.",
        steps: [
          "Open Pinly in Safari.",
          "Tap the Share button.",
          "Choose Add to Home Screen, then tap Add."
        ]
      };
    case "android":
      return {
        summary: "If the install prompt is not ready yet, you can still add Pinly from your browser menu.",
        steps: [
          "Open your browser menu.",
          "Choose Install app or Add to Home screen.",
          "Confirm to save Pinly like an app."
        ]
      };
    default:
      return {
        summary: "Install is best from a supported phone browser. Desktop browsers may show their own install icon when available.",
        steps: [
          "Open Pinly on your phone for the best app-like install flow.",
          "On desktop Chrome or Edge, use the browser install icon if it appears.",
          "You can always come back here later from your profile."
        ]
      };
  }
}
