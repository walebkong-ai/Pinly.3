import { NextResponse } from "next/server";
import { ZodError } from "zod";

const DEFAULT_JSON_BODY_LIMIT_BYTES = 32 * 1024;
const jsonContentTypePattern = /^(application\/json|application\/[\w.+-]+\+json)\b/i;
const byteEncoder = new TextEncoder();

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: string;

  constructor(
    message: string,
    status = 400,
    options?: {
      code?: string;
      details?: string;
    }
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function apiError(
  message: string,
  status = 400,
  options?: {
    code?: string;
    details?: string;
  }
) {
  return NextResponse.json(
    {
      error: message,
      ...(options?.code ? { code: options.code } : {}),
      ...(process.env.NODE_ENV !== "production" && options?.details ? { details: options.details } : {})
    },
    { status }
  );
}

export function apiValidationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      issues: error.flatten()
    },
    { status: 422 }
  );
}

function getRequestByteLength(value: string) {
  return byteEncoder.encode(value).length;
}

function readContentLength(request: Request) {
  const rawValue = request.headers.get("content-length");

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function toApiErrorResponse(error: unknown) {
  if (error instanceof ApiRequestError) {
    return apiError(error.message, error.status, {
      code: error.code,
      details: error.details
    });
  }

  return apiError("Request could not be processed.", 400, {
    code: "REQUEST_INVALID"
  });
}

export async function readJsonBody(
  request: Request,
  options?: {
    maxBytes?: number;
    requireContentType?: boolean;
    invalidJsonMessage?: string;
    invalidJsonCode?: string;
    missingBodyMessage?: string;
    missingBodyCode?: string;
    unsupportedMediaTypeMessage?: string;
    unsupportedMediaTypeCode?: string;
    tooLargeMessage?: string;
    tooLargeCode?: string;
  }
) {
  const maxBytes = options?.maxBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES;
  const contentType = request.headers.get("content-type")?.trim() ?? "";

  if ((options?.requireContentType ?? true) && !jsonContentTypePattern.test(contentType)) {
    throw new ApiRequestError(
      options?.unsupportedMediaTypeMessage ?? "Requests must use application/json.",
      415,
      {
        code: options?.unsupportedMediaTypeCode ?? "REQUEST_UNSUPPORTED_MEDIA_TYPE"
      }
    );
  }

  const contentLength = readContentLength(request);

  if (contentLength !== null && contentLength > maxBytes) {
    throw new ApiRequestError(
      options?.tooLargeMessage ?? "Request body is too large.",
      413,
      {
        code: options?.tooLargeCode ?? "REQUEST_BODY_TOO_LARGE"
      }
    );
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch (error) {
    throw new ApiRequestError(
      options?.invalidJsonMessage ?? "Invalid JSON payload.",
      400,
      {
        code: options?.invalidJsonCode ?? "REQUEST_INVALID_JSON",
        details: error instanceof Error ? error.message : "Unknown request body parse failure"
      }
    );
  }

  if (!rawBody.trim()) {
    throw new ApiRequestError(
      options?.missingBodyMessage ?? "Request body is required.",
      400,
      {
        code: options?.missingBodyCode ?? "REQUEST_BODY_REQUIRED"
      }
    );
  }

  if (getRequestByteLength(rawBody) > maxBytes) {
    throw new ApiRequestError(
      options?.tooLargeMessage ?? "Request body is too large.",
      413,
      {
        code: options?.tooLargeCode ?? "REQUEST_BODY_TOO_LARGE"
      }
    );
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw new ApiRequestError(
      options?.invalidJsonMessage ?? "Invalid JSON payload.",
      400,
      {
        code: options?.invalidJsonCode ?? "REQUEST_INVALID_JSON",
        details: error instanceof Error ? error.message : "Unknown JSON parse failure"
      }
    );
  }
}
