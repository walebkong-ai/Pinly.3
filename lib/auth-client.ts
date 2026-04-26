const localAuthHosts = new Set(["127.0.0.1", "localhost"]);

export function normalizeAuthCallbackUrl(value: string | null, fallback = "/map") {
  if (!value) {
    return fallback;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const parsedValue = new URL(value);

    if (!localAuthHosts.has(parsedValue.hostname)) {
      return fallback;
    }

    const normalizedPath = `${parsedValue.pathname}${parsedValue.search}${parsedValue.hash}`;
    return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  } catch {
    return fallback;
  }
}

export function syncAuthCallbackUrlCookie(callbackUrl: string) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const normalizedCallbackUrl = normalizeAuthCallbackUrl(callbackUrl);
  const absoluteCallbackUrl = new URL(normalizedCallbackUrl, window.location.origin).toString();
  const encodedCallbackUrl = encodeURIComponent(absoluteCallbackUrl);

  for (const cookieName of ["authjs.callback-url", "next-auth.callback-url"]) {
    document.cookie = `${cookieName}=${encodedCallbackUrl}; Path=/; SameSite=Lax`;
  }
}
