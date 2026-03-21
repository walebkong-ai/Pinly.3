import { describe, expect, test } from "vitest";
import {
  createPendingLegalConsentToken,
  parsePendingLegalConsentToken,
  privacySections,
  termsSections
} from "@/lib/legal";

describe("legal helpers", () => {
  test("pending legal consent tokens round-trip into acceptance records", () => {
    const acceptedAt = new Date();
    const token = createPendingLegalConsentToken(acceptedAt);

    expect(parsePendingLegalConsentToken(token)).toEqual({
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt,
      termsVersion: "2026-03-21",
      privacyVersion: "2026-03-21"
    });
  });

  test("expired pending legal consent tokens are rejected", () => {
    const token = createPendingLegalConsentToken(new Date(Date.now() - 11 * 60 * 1000));
    expect(parsePendingLegalConsentToken(token)).toBeNull();
  });

  test("terms and privacy content cover the main Pinly feature areas", () => {
    expect(termsSections.some((section) => section.title === "Acceptable use")).toBe(true);
    expect(privacySections.some((section) => section.title === "Visibility and sharing")).toBe(true);
  });
});
