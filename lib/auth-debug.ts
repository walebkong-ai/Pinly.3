import { isLocalAuthOrigin } from "@/lib/auth-local";

type LocalAuthDebugMetadata = Record<string, unknown> & {
  requestUrl?: string;
};
type LocalAuthLoggerSnapshot = {
  createdAt: number;
  event: string;
  name: string;
  message: string;
  stack: string | null;
  cause: unknown;
};
type LocalAuthErrorSnapshot = {
  createdAt: number;
  event: string;
  metadata: LocalAuthDebugMetadata | null;
  error: unknown;
};

declare global {
  var __pinlyLastLocalAuthLoggerError: LocalAuthLoggerSnapshot | undefined;
  var __pinlyLastLocalAuthError: LocalAuthErrorSnapshot | undefined;
}

function getConfiguredAuthUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || null;
}

function shouldLogLocalAuth(metadata?: LocalAuthDebugMetadata) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const requestUrl = typeof metadata?.requestUrl === "string" ? metadata.requestUrl : null;
  const authUrl = requestUrl || getConfiguredAuthUrl();
  return authUrl ? isLocalAuthOrigin(authUrl) : false;
}

function serializeDebugValue(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      currentValue instanceof Error
        ? {
            name: currentValue.name,
            message: currentValue.message,
            stack: currentValue.stack,
            cause: currentValue.cause
          }
        : currentValue
    )
  );
}

export function logLocalAuthDebug(event: string, metadata?: LocalAuthDebugMetadata) {
  if (!shouldLogLocalAuth(metadata)) {
    return;
  }

  if (metadata) {
    console.info(`[auth:debug] ${event}`, metadata);
    return;
  }

  console.info(`[auth:debug] ${event}`);
}

export function logLocalAuthError(event: string, error: unknown, metadata?: LocalAuthDebugMetadata) {
  if (!shouldLogLocalAuth(metadata)) {
    return;
  }

  globalThis.__pinlyLastLocalAuthError = {
    createdAt: Date.now(),
    event,
    metadata: metadata ?? null,
    error: serializeDebugValue(error)
  };

  if (metadata) {
    console.error(`[auth:debug] ${event}`, metadata, error);
    return;
  }

  console.error(`[auth:debug] ${event}`, error);
}

export function logLocalAuthLoggerError(event: string, error: Error, metadata?: LocalAuthDebugMetadata) {
  if (!shouldLogLocalAuth(metadata)) {
    return;
  }

  globalThis.__pinlyLastLocalAuthLoggerError = {
    createdAt: Date.now(),
    event,
    name: error.name,
    message: error.message,
    stack: error.stack ?? null,
    cause: error.cause === undefined ? null : serializeDebugValue(error.cause)
  };
}

export function consumeLocalAuthLoggerError(maxAgeMs = 5_000) {
  const snapshot = globalThis.__pinlyLastLocalAuthLoggerError;

  if (!snapshot) {
    return null;
  }

  if (Date.now() - snapshot.createdAt > maxAgeMs) {
    globalThis.__pinlyLastLocalAuthLoggerError = undefined;
    return null;
  }

  globalThis.__pinlyLastLocalAuthLoggerError = undefined;
  return snapshot;
}

export function consumeLocalAuthError(maxAgeMs = 5_000) {
  const snapshot = globalThis.__pinlyLastLocalAuthError;

  if (!snapshot) {
    return null;
  }

  if (Date.now() - snapshot.createdAt > maxAgeMs) {
    globalThis.__pinlyLastLocalAuthError = undefined;
    return null;
  }

  globalThis.__pinlyLastLocalAuthError = undefined;
  return snapshot;
}
