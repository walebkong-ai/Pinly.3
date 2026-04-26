export const LOCAL_AUTH_HOSTS = new Set(["127.0.0.1", "localhost"]);

function safeParseUrl(value: string, base?: string) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

export function isLocalAuthHost(hostname: string) {
  return LOCAL_AUTH_HOSTS.has(hostname);
}

export function isLocalAuthOrigin(value: string) {
  const parsedValue = safeParseUrl(value);
  return parsedValue ? isLocalAuthHost(parsedValue.hostname) : false;
}

export function normalizeLocalAuthUrl(value: string, targetUrl: string) {
  const parsedTargetUrl = safeParseUrl(targetUrl);
  const parsedValue = safeParseUrl(value);

  if (!parsedTargetUrl || !parsedValue) {
    return value;
  }

  if (!isLocalAuthHost(parsedTargetUrl.hostname) || !isLocalAuthHost(parsedValue.hostname)) {
    return value;
  }

  if (parsedValue.origin === parsedTargetUrl.origin) {
    return value;
  }

  parsedValue.protocol = parsedTargetUrl.protocol;
  parsedValue.hostname = parsedTargetUrl.hostname;
  parsedValue.port = parsedTargetUrl.port;

  return parsedValue.toString();
}

export function resolveAuthRedirectUrl(url: string, baseUrl: string) {
  const parsedBaseUrl = safeParseUrl(baseUrl);

  if (!parsedBaseUrl) {
    return baseUrl;
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    return new URL(url, parsedBaseUrl).toString();
  }

  const parsedUrl = safeParseUrl(url);

  if (!parsedUrl) {
    return parsedBaseUrl.toString();
  }

  if (parsedUrl.origin === parsedBaseUrl.origin) {
    return parsedUrl.toString();
  }

  if (isLocalAuthHost(parsedBaseUrl.hostname) && isLocalAuthHost(parsedUrl.hostname)) {
    return normalizeLocalAuthUrl(parsedUrl.toString(), parsedBaseUrl.toString());
  }

  return parsedBaseUrl.toString();
}
