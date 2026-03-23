import { z } from "zod";

export const reportCategoryOptions = [
  {
    value: "SPAM",
    label: "Spam",
    description: "Scams, repetitive promotion, or misleading engagement bait."
  },
  {
    value: "HARASSMENT",
    label: "Harassment",
    description: "Bullying, threats, or repeated unwanted contact."
  },
  {
    value: "HATE_OR_ABUSE",
    label: "Hate or abuse",
    description: "Targeted abuse, hateful conduct, or degrading attacks."
  },
  {
    value: "NUDITY_OR_SEXUAL_CONTENT",
    label: "Sexual content",
    description: "Explicit sexual material or unwanted nudity."
  },
  {
    value: "VIOLENCE_OR_DANGEROUS",
    label: "Violence",
    description: "Violent, graphic, or dangerous behavior."
  },
  {
    value: "IMPERSONATION",
    label: "Impersonation",
    description: "Pretending to be someone else or misrepresenting identity."
  },
  {
    value: "PRIVACY_CONCERN",
    label: "Privacy",
    description: "Doxxing, non-consensual sharing, or privacy invasion."
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Something else that needs moderation review."
  }
] as const;

export const reportCategorySchema = z.enum([
  "SPAM",
  "HARASSMENT",
  "HATE_OR_ABUSE",
  "NUDITY_OR_SEXUAL_CONTENT",
  "VIOLENCE_OR_DANGEROUS",
  "IMPERSONATION",
  "PRIVACY_CONCERN",
  "OTHER"
]);

export type ReportCategoryValue = z.infer<typeof reportCategorySchema>;

export const reportPayloadSchema = z.object({
  category: reportCategorySchema,
  details: z
    .string()
    .trim()
    .max(1000, "Keep report details under 1000 characters.")
    .optional()
    .transform((value) => value?.trim() || undefined)
});

export type ReportPayload = z.infer<typeof reportPayloadSchema>;

export function buildUserReportDedupeKey(
  reporterId: string,
  reportedId: string,
  category: ReportCategoryValue
) {
  return `USER:${reporterId}:${reportedId}:${category}`;
}

export function buildPostReportDedupeKey(
  reporterId: string,
  postId: string,
  category: ReportCategoryValue
) {
  return `POST:${reporterId}:${postId}:${category}`;
}

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
  );
}
