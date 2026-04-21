import { cookies } from "next/headers";
import { apiError, apiValidationError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import {
  createPendingLegalConsentToken,
  getPendingLegalConsentCookieOptions,
  LEGAL_CONSENT_COOKIE_NAME,
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
    body = await readJsonBody(request, {
      maxBytes: 4 * 1024,
      invalidJsonCode: "LEGAL_CONSENT_INVALID_JSON",
      invalidJsonMessage: "Invalid JSON payload."
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }

  const parsed = legalConsentSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const cookieStore = await cookies();
  cookieStore.set(
    LEGAL_CONSENT_COOKIE_NAME,
    createPendingLegalConsentToken(),
    getPendingLegalConsentCookieOptions()
  );

  return Response.json({
    ok: true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION
  });
}
