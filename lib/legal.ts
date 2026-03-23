import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

export const TERMS_VERSION = "2026-03-22";
export const PRIVACY_VERSION = "2026-03-22";
export const LEGAL_LAST_UPDATED_LABEL = "March 22, 2026";
export const LEGAL_CONSENT_COOKIE_NAME = "pinly_legal_signup";
export const LEGAL_CONSENT_MAX_AGE_SECONDS = 10 * 60;

export type LegalAcceptanceRecord = {
  termsAcceptedAt: Date;
  privacyAcceptedAt: Date;
  termsVersion: string;
  privacyVersion: string;
};

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const pendingLegalConsentSchema = z.object({
  acceptedAt: z.string().datetime(),
  termsVersion: z.literal(TERMS_VERSION),
  privacyVersion: z.literal(PRIVACY_VERSION)
});

export const termsSections: LegalSection[] = [
  {
    title: "Who Pinly is for",
    paragraphs: [
      "Pinly is a private, map-first social travel app for people who want to save place-based memories and share them with people they trust.",
      "You may only use Pinly if you can legally agree to these terms. If you are under the minimum age required where you live, do not create an account."
    ]
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "Use Pinly respectfully and lawfully. Do not use the app to harass people, impersonate someone else, scrape data, spam users, or interfere with the service.",
      "Do not upload illegal content, malware, or anything that could harm other users or the platform.",
      "Pinly includes blocking and reporting tools. Misusing the app or trying to work around those controls can lead to content removal, account restrictions, or account deletion."
    ]
  },
  {
    title: "Your content",
    paragraphs: [
      "You keep responsibility for the photos, videos, captions, route points, collection names, and other content you add to Pinly.",
      "By posting to Pinly, you give us the limited rights needed to host, process, display, and share that content according to your chosen visibility settings and the app's features."
    ]
  },
  {
    title: "Accounts and security",
    paragraphs: [
      "You are responsible for the activity on your account and for keeping your password, sign-in methods, and devices reasonably secure.",
      "Pinly works to reduce abuse, but no online service can promise perfect security or uninterrupted availability."
    ]
  },
  {
    title: "Availability and changes",
    paragraphs: [
      "Pinly is still evolving. Features may change, pause, or be removed. We may also update these terms as the app changes.",
      "If we make a meaningful update, we may post a new version in the app or otherwise notify users when practical."
    ]
  },
  {
    title: "Suspension and removal",
    paragraphs: [
      "We may suspend, restrict, or remove accounts or content that create security, legal, or abuse risks, or that violate these terms.",
      "You can also delete your own account from Settings or by using Pinly's web deletion page when you are signed in."
    ]
  },
  {
    title: "Disclaimers and liability limits",
    paragraphs: [
      "Pinly is provided on an as available basis. We do not promise the service will always be available, error-free, or secure.",
      "To the extent allowed by law, Pinly is not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, content, travel plans, or business."
    ]
  },
  {
    title: "Questions",
    paragraphs: [
      "For self-serve account deletion, use Settings > Delete Account in the app or the /delete-account page while signed in.",
      "If you need help with these terms beyond the in-app controls, use any support or contact path that Pinly currently provides."
    ]
  }
];

export const privacySections: LegalSection[] = [
  {
    title: "What Pinly collects",
    paragraphs: [
      "Pinly collects the information you provide to create and use your account, including your name, username, email address, password hash, profile image, and any optional sign-in provider details.",
      "We also store the content and activity needed to run the app, such as posts, captions, photos, videos, place names, map coordinates, visit dates, collections, saved items, comments, likes, friendships, invites, notifications, and messages.",
      "When you use Pinly's safety controls, we store block relationships, reports, and related moderation records. We also store legal acceptance timestamps and policy version records when you create an account."
    ]
  },
  {
    title: "How we use data",
    paragraphs: [
      "We use your data to operate the map, feed, profile, friendship, collection, notification, and messaging features of Pinly.",
      "We also use it to protect accounts, enforce sharing rules, prevent abuse, review safety reports, process account deletion, troubleshoot issues, and improve the product."
    ]
  },
  {
    title: "Visibility and sharing",
    paragraphs: [
      "Pinly is built around intentional sharing. Some content is visible only to you, some to accepted friends, and some can be made public depending on the feature and visibility setting you choose.",
      "Messages are intended for the participants in that conversation. Collections, posts, and route points follow the sharing rules Pinly applies on the server at the time they are viewed.",
      "If you block someone, Pinly removes that relationship from normal friend, profile, feed, and direct-message paths that the current product supports."
    ]
  },
  {
    title: "Infrastructure and third parties",
    paragraphs: [
      "Pinly relies on infrastructure providers to run the app, including hosting, database, authentication, storage, and mapping or geocoding services.",
      "If you use optional Google sign-in, Google provides that authentication step. Map and place lookup features may also call mapping and geocoding providers to return location data."
    ]
  },
  {
    title: "Storage and security",
    paragraphs: [
      "We use reasonable measures to protect Pinly data, but no system can guarantee absolute security. Some copies may remain in backups, logs, or cached systems for a limited time."
    ]
  },
  {
    title: "Your choices",
    paragraphs: [
      "You can edit or remove much of your content from inside the app. You can also block users, submit reports, and manage sharing settings where those controls appear.",
      "You can delete your account from Settings or from the /delete-account page while signed in. Deleted accounts are removed from app access, although limited backup or log copies may remain for a short time."
    ]
  },
  {
    title: "Policy changes",
    paragraphs: [
      "We may update this Privacy Policy as Pinly changes. When we do, we will publish the updated version in the app."
    ]
  }
];

function getLegalSigningSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required to sign Pinly legal consent cookies in production.");
  }

  return "pinly-legal-consent-dev";
}

function signPendingConsentPayload(payloadBase64: string) {
  return createHmac("sha256", getLegalSigningSecret()).update(payloadBase64).digest("base64url");
}

export function createLegalAcceptanceRecord(acceptedAt = new Date()): LegalAcceptanceRecord {
  return {
    termsAcceptedAt: acceptedAt,
    privacyAcceptedAt: acceptedAt,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION
  };
}

export function createPendingLegalConsentToken(acceptedAt = new Date()) {
  const payload = {
    acceptedAt: acceptedAt.toISOString(),
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPendingConsentPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function readCookieValue(cookieHeader: string | null | undefined, cookieName: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");

    if (name === cookieName) {
      return rest.join("=") || null;
    }
  }

  return null;
}

export function parsePendingLegalConsentToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPendingConsentPayload(payloadBase64);
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);

  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    const parsed = pendingLegalConsentSchema.safeParse(payload);

    if (!parsed.success) {
      return null;
    }

    const acceptedAt = new Date(parsed.data.acceptedAt);

    if (Number.isNaN(acceptedAt.getTime())) {
      return null;
    }

    if (Date.now() - acceptedAt.getTime() > LEGAL_CONSENT_MAX_AGE_SECONDS * 1000) {
      return null;
    }

    return createLegalAcceptanceRecord(acceptedAt);
  } catch {
    return null;
  }
}

export function readPendingLegalConsentFromCookieHeader(cookieHeader: string | null | undefined) {
  return parsePendingLegalConsentToken(readCookieValue(cookieHeader, LEGAL_CONSENT_COOKIE_NAME));
}

export function getPendingLegalConsentCookieOptions(maxAge = LEGAL_CONSENT_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/"
  };
}

export function createExpiredPendingLegalConsentCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${LEGAL_CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

export async function readPendingLegalConsent() {
  const cookieStore = await cookies();
  return parsePendingLegalConsentToken(cookieStore.get(LEGAL_CONSENT_COOKIE_NAME)?.value);
}
