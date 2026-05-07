import { z } from "zod";
import { POST_MEDIA_ASPECT_RATIOS } from "@/lib/post-display";
import type { MapCategory } from "@/types/app";

export const usernameRegex = /^[a-z0-9_-]{3,20}$/;
export const usernameValidationMessage = "Use 3-20 lowercase letters, numbers, underscores, or hyphens";
const controlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function createTextField(
  {
    min,
    max,
    allowNewlines = false
  }: {
    min: number;
    max: number;
    allowNewlines?: boolean;
  },
  message?: string
) {
  return z
    .string()
    .trim()
    .min(min, message)
    .max(max, message)
    .refine((value) => !controlCharacterPattern.test(value), {
      message: message ?? "Contains unsupported control characters."
    })
    .refine((value) => allowNewlines || !/[\r\n]/.test(value), {
      message: message ?? "Must be a single line of text."
    });
}

function createCaptionField() {
  return createTextField({ min: 1, max: 600, allowNewlines: true });
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export const usernameSchema = z.string().regex(usernameRegex, usernameValidationMessage);
export const normalizedUsernameSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeUsername(value) : value),
  usernameSchema
);
export const requiredLegalAcceptanceSchema = z.boolean().refine((value) => value, {
  message: "You must accept the Terms of Service and Privacy Policy."
});
const mapCategoryValues = ["photo", "video", "food", "nature", "landmark", "neighborhood"] as const satisfies readonly MapCategory[];
const postMediaAspectRatioSchema = z.enum(POST_MEDIA_ASPECT_RATIOS);

const csvArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string" && value.trim().length > 0) {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return [];
    },
    z.array(itemSchema)
  );

export const signUpSchema = z.object({
  name: createTextField({ min: 2, max: 50 }),
  username: usernameSchema,
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
  acceptLegal: requiredLegalAcceptanceSchema,
  inviteToken: z.string().optional()
});

export const legalConsentSchema = z.object({
  acceptLegal: requiredLegalAcceptanceSchema
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters.").max(100)
});

export const friendRequestSchema = z.object({
  username: normalizedUsernameSchema
});

export const friendRequestActionSchema = z.object({
  requestId: z.string().cuid(),
  action: z.enum(["accept", "decline"])
});

export const pushTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["ios", "android"])
});

export const uploadUrlSchema = z.object({
  mediaUrl: z.string().min(1),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  thumbnailUrl: z.string().min(1).optional().nullable()
});

export const postSchema = z.object({
  mediaType: z.enum(["IMAGE"]),
  mediaUrl: z.string().min(1),
  thumbnailUrl: z.string().optional().nullable(),
  mediaAspectRatio: postMediaAspectRatioSchema.optional().nullable(),
  mediaWidth: z.coerce.number().int().min(1).max(4096).optional().nullable(),
  mediaHeight: z.coerce.number().int().min(1).max(4096).optional().nullable(),
  cropZoom: z.coerce.number().min(1).max(5).optional().nullable(),
  cropOffsetX: z.coerce.number().min(-4096).max(4096).optional().nullable(),
  cropOffsetY: z.coerce.number().min(-4096).max(4096).optional().nullable(),
  caption: createCaptionField(),
  placeName: createTextField({ min: 2, max: 120 }),
  city: createTextField({ min: 2, max: 80 }),
  country: createTextField({ min: 2, max: 80 }),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  visitedAt: z.string().datetime(),
  taggedUserIds: z.array(z.string().cuid()).max(24).default([]),
  collectionIds: z.array(z.string().cuid()).max(24).default([])
});

export const editPostSchema = z.object({
  caption: createCaptionField(),
  placeName: createTextField({ min: 2, max: 120 }),
  city: createTextField({ min: 2, max: 80 }),
  country: createTextField({ min: 2, max: 80 }),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  visitedAt: z.string().datetime(),
  taggedUserIds: z.array(z.string().cuid()).max(24).default([])
});

export const COLLECTION_COLORS = [
  "#E04040",
  "#E07A40",
  "#D4B800",
  "#3A9E5C",
  "#38B6C9",
  "#3A6EC9",
  "#7A40C9",
  "#C940A0"
] as const;

export type CollectionColor = (typeof COLLECTION_COLORS)[number];

const collectionColorField = z
  .enum(COLLECTION_COLORS as unknown as [string, ...string[]])
  .nullable()
  .optional();

export const COLLECTION_VISIBILITY_VALUES = ["public", "friends", "private"] as const;
export type CollectionVisibilityValue = (typeof COLLECTION_VISIBILITY_VALUES)[number];
const collectionVisibilityField = z.enum(COLLECTION_VISIBILITY_VALUES).optional();

export const collectionSchema = z.object({
  name: createTextField({ min: 2, max: 60 }),
  color: collectionColorField,
  visibility: collectionVisibilityField
});

export const collectionUpdateSchema = z.object({
  name: createTextField({ min: 2, max: 60 }).optional(),
  color: collectionColorField,
  visibility: collectionVisibilityField
});

export const collectionAssignmentSchema = z.object({
  collectionIds: z.array(z.string().cuid()).max(24).default([])
});

export const wantToGoPlaceSchema = z.object({
  placeName: createTextField({ min: 2, max: 120 }),
  city: createTextField({ min: 2, max: 80 }),
  country: createTextField({ min: 2, max: 80 }),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

export const wantToGoDeleteSchema = z.object({
  itemId: z.string().cuid()
});

export const mapQuerySchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().min(0).max(20),
  q: z.string().optional(),
  layer: z.enum(["friends", "you", "both"]).default("both"),
  time: z.enum(["all", "30d", "6m", "1y"]).default("all"),
  groups: csvArray(z.string().cuid()).default([]),
  categories: csvArray(z.enum(mapCategoryValues)).default([])
});

export const cityQuerySchema = z.object({
  city: createTextField({ min: 2, max: 80 }),
  country: createTextField({ min: 2, max: 80 }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24)
});

export const placeSearchSchema = z.object({
  q: createTextField({ min: 2, max: 120 })
});
