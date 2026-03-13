import { NextResponse } from "next/server";
import { ZodError } from "zod";

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
