import { handlers } from "@/lib/auth";
import { consumeLocalAuthError, consumeLocalAuthLoggerError, logLocalAuthDebug } from "@/lib/auth-debug";
import { isLocalAuthHost, normalizeLocalAuthUrl } from "@/lib/auth-local";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
const { GET: authGet, POST: authPost } = handlers;

function shouldLogAuthPath(pathname: string) {
  return pathname.endsWith("/callback/credentials") || pathname.endsWith("/csrf") || pathname.endsWith("/session");
}

function safeParseUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resolveIncomingAuthRequestUrl(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const originHeader = safeParseUrl(request.headers.get("origin"));

  if (forwardedHost) {
    const resolvedUrl = new URL(request.url);
    const resolvedProtocol = forwardedProto ?? originHeader?.protocol ?? requestUrl.protocol;

    resolvedUrl.protocol = resolvedProtocol.endsWith(":") ? resolvedProtocol : `${resolvedProtocol}:`;
    resolvedUrl.host = forwardedHost;

    if (isLocalAuthHost(resolvedUrl.hostname)) {
      return resolvedUrl;
    }
  }

  if (originHeader && isLocalAuthHost(originHeader.hostname)) {
    const resolvedUrl = new URL(request.url);
    resolvedUrl.protocol = originHeader.protocol;
    resolvedUrl.hostname = originHeader.hostname;
    resolvedUrl.port = originHeader.port;
    return resolvedUrl;
  }

  return requestUrl;
}

function normalizeAuthRequest(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return request;
  }

  const requestUrl = resolveIncomingAuthRequestUrl(request);

  if (!isLocalAuthHost(requestUrl.hostname)) {
    return request;
  }

  const headers = new Headers(request.headers);
  const normalizedHost = requestUrl.host;

  headers.set("host", normalizedHost);
  headers.set("origin", requestUrl.origin);
  headers.set("x-forwarded-host", normalizedHost);
  headers.set("x-forwarded-port", requestUrl.port);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(/:$/, ""));

  return new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    keepalive: request.keepalive,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
    // Required when forwarding a readable request body in Node.
    duplex: "half"
  });
}

function normalizeAuthSetCookie(setCookieValue: string, targetUrl: string) {
  return setCookieValue.replace(
    /((?:__Secure-)?(?:authjs|next-auth)\.callback-url=)([^;]+)/,
    (match, prefix: string, encodedValue: string) => {
      let decodedValue = encodedValue;

      try {
        decodedValue = decodeURIComponent(encodedValue);
      } catch {
        return match;
      }

      const normalizedValue = normalizeLocalAuthUrl(decodedValue, targetUrl);

      if (normalizedValue === decodedValue) {
        return match;
      }

      return `${prefix}${encodeURIComponent(normalizedValue)}`;
    }
  );
}

function getSetCookieValues(headers: Headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const setCookieValue = headers.get("set-cookie");
  return setCookieValue ? [setCookieValue] : [];
}

function getCookieNames(setCookieValues: string[]) {
  return setCookieValues
    .map((setCookieValue) => setCookieValue.split("=", 1)[0]?.trim() ?? "")
    .filter(Boolean);
}

function getNormalizedLocalAuthEnvOrigin(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const requestUrl = resolveIncomingAuthRequestUrl(request);
  const configuredAuthUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  if (!configuredAuthUrl || !isLocalAuthHost(requestUrl.hostname)) {
    return null;
  }

  try {
    const configuredUrl = new URL(configuredAuthUrl);

    if (!isLocalAuthHost(configuredUrl.hostname) || configuredUrl.origin === requestUrl.origin) {
      return null;
    }

    return requestUrl.origin;
  } catch {
    return null;
  }
}

async function withNormalizedLocalAuthEnv<T>(request: NextRequest, run: () => Promise<T>) {
  const normalizedOrigin = getNormalizedLocalAuthEnvOrigin(request);

  if (!normalizedOrigin) {
    return run();
  }

  const previousAuthUrl = process.env.AUTH_URL;
  const previousNextAuthUrl = process.env.NEXTAUTH_URL;

  process.env.AUTH_URL = normalizedOrigin;
  process.env.NEXTAUTH_URL = normalizedOrigin;

  logLocalAuthDebug("route.env_override", {
    requestUrl: request.url,
    normalizedOrigin,
    previousAuthUrl: previousAuthUrl ?? null,
    previousNextAuthUrl: previousNextAuthUrl ?? null
  });

  try {
    return await run();
  } finally {
    if (previousAuthUrl === undefined) {
      delete process.env.AUTH_URL;
    } else {
      process.env.AUTH_URL = previousAuthUrl;
    }

    if (previousNextAuthUrl === undefined) {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = previousNextAuthUrl;
    }
  }
}

function normalizeAuthResponseBody(bodyText: string, contentType: string | null, targetUrl: string) {
  if (!bodyText || !contentType?.includes("application/json")) {
    return {
      bodyText,
      responseUrl: null as string | null
    };
  }

  try {
    const payload = JSON.parse(bodyText) as { url?: unknown };

    if (typeof payload.url !== "string") {
      return {
        bodyText,
        responseUrl: null as string | null
      };
    }

    const normalizedUrl = normalizeLocalAuthUrl(payload.url, targetUrl);

    if (normalizedUrl === payload.url) {
      return {
        bodyText,
        responseUrl: payload.url
      };
    }

    return {
      bodyText: JSON.stringify({
        ...payload,
        url: normalizedUrl
      }),
      responseUrl: normalizedUrl
    };
  } catch {
    return {
      bodyText,
      responseUrl: null as string | null
    };
  }
}

async function normalizeAuthResponse(response: Response, request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return response;
  }

  const nextHeaders = new Headers();
  const normalizedRequestUrl = resolveIncomingAuthRequestUrl(request);
  const pathname = normalizedRequestUrl.pathname;
  const contentType = response.headers.get("content-type");
  const responseBodyText = await response.text();
  const normalizedSetCookieValues = getSetCookieValues(response.headers).map((setCookieValue) =>
    normalizeAuthSetCookie(setCookieValue, normalizedRequestUrl.toString())
  );
  const { bodyText: normalizedBodyText, responseUrl } = normalizeAuthResponseBody(
    responseBodyText,
    contentType,
    normalizedRequestUrl.toString()
  );

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      continue;
    }

    if (key.toLowerCase() === "location") {
      nextHeaders.set(key, normalizeLocalAuthUrl(value, normalizedRequestUrl.toString()));
      continue;
    }

    if (key.toLowerCase() === "content-length") {
      continue;
    }

    nextHeaders.set(key, value);
  }

  for (const setCookieValue of normalizedSetCookieValues) {
    nextHeaders.append("set-cookie", setCookieValue);
  }

  const authLoggerError = consumeLocalAuthLoggerError();
  const authDebugError = consumeLocalAuthError();

  if (authLoggerError) {
    nextHeaders.set("x-pinly-auth-error-name", authLoggerError.name);
    nextHeaders.set("x-pinly-auth-error-message", authLoggerError.message.slice(0, 200));
    nextHeaders.set(
      "x-pinly-auth-error-cause",
      JSON.stringify(authLoggerError.cause).slice(0, 500)
    );
  }

  if (authDebugError) {
    nextHeaders.set("x-pinly-auth-debug-event", authDebugError.event);
    nextHeaders.set(
      "x-pinly-auth-debug-error",
      JSON.stringify(authDebugError.error).slice(0, 500)
    );
  }

  if (shouldLogAuthPath(pathname)) {
    logLocalAuthDebug("route.response", {
      requestUrl: request.url,
      normalizedRequestUrl: normalizedRequestUrl.toString(),
      pathname,
      method: request.method,
      status: response.status,
      location: nextHeaders.get("location"),
      responseUrl,
      setCookieNames: getCookieNames(normalizedSetCookieValues),
      authErrorName: authLoggerError?.name ?? null,
      authDebugEvent: authDebugError?.event ?? null
    });
  }

  return new Response(normalizedBodyText || null, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders
  });
}

export async function GET(request: NextRequest) {
  const normalizedRequest = normalizeAuthRequest(request);
  const pathname = resolveIncomingAuthRequestUrl(request).pathname;

  if (shouldLogAuthPath(pathname)) {
    logLocalAuthDebug("route.request", {
      requestUrl: request.url,
      pathname,
      method: request.method,
      normalizedUrl: normalizedRequest.url
    });
  }

  const response = await withNormalizedLocalAuthEnv(request, () => authGet(normalizedRequest));
  return normalizeAuthResponse(response, request);
}

export async function POST(request: NextRequest) {
  const pathname = resolveIncomingAuthRequestUrl(request).pathname;

  if (pathname.endsWith("/callback/credentials")) {
    const rateLimitResponse = await enforceRateLimit({
      scope: "auth-sign-in",
      request,
      limit: 10,
      windowMs: 15 * 60 * 1000
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  const normalizedRequest = normalizeAuthRequest(request);
  const pathnameToLog = resolveIncomingAuthRequestUrl(request).pathname;

  if (shouldLogAuthPath(pathnameToLog)) {
    logLocalAuthDebug("route.request", {
      requestUrl: request.url,
      pathname: pathnameToLog,
      method: request.method,
      normalizedUrl: normalizedRequest.url
    });
  }

  const response = await withNormalizedLocalAuthEnv(request, () => authPost(normalizedRequest));
  return normalizeAuthResponse(response, request);
}
