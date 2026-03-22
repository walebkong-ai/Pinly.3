import { cookies } from "next/headers";
import { apiError, apiValidationError } from "@/lib/api";
import {
  createPendingLegalConsentToken,
  LEGAL_CONSENT_COOKIE_NAME,
  LEGAL_CONSENT_MAX_AGE_SECONDS,
  PRIVACY_VERSION,
  TERMS_VERSION
} from "@/lib/legal";
import { enforceRateLimit } from "@/lib/rate-limit";
import { legalConsentSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit({
    scope: "legal-consent",
    request,
    limit: 12,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "LEGAL_CONSENT_INVALID_JSON" });
  }

  const parsed = legalConsentSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const cookieStore = await cookies();
  cookieStore.set(LEGAL_CONSENT_COOKIE_NAME, createPendingLegalConsentToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LEGAL_CONSENT_MAX_AGE_SECONDS,
    path: "/"
  });

  return Response.json({
    ok: true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION
  });
}
