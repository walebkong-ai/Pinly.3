import { z } from "zod";
import type { MapCategory } from "@/types/app";

export const usernameRegex = /^[a-z0-9_-]{3,20}$/;
export const usernameValidationMessage = "Use 3-20 lowercase letters, numbers, underscores, or hyphens";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export const usernameSchema = z.string().regex(usernameRegex, usernameValidationMessage);
export const normalizedUsernameSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeUsername(value) : value),
  usernameSchema
);
const mapCategoryValues = ["photo", "video", "food", "nature", "landmark", "neighborhood"] as const satisfies readonly MapCategory[];

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
  name: z.string().min(2).max(50),
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
  inviteToken: z.string().optional()
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100)
});

export const friendRequestSchema = z.object({
  username: normalizedUsernameSchema
});

export const friendRequestActionSchema = z.object({
  requestId: z.string().cuid(),
  action: z.enum(["accept", "decline"])
});

export const uploadUrlSchema = z.object({
  mediaUrl: z.string().url(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  thumbnailUrl: z.string().url().optional().nullable()
});

export const postSchema = z.object({
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  mediaUrl: z.string().min(1),
  thumbnailUrl: z.string().optional().nullable(),
  caption: z.string().min(3).max(600),
  placeName: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  country: z.string().min(2).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  visitedAt: z.string().datetime(),
  taggedUserIds: z.array(z.string().cuid()).max(24).default([]),
  collectionIds: z.array(z.string().cuid()).max(24).default([])
});

export const editPostSchema = z.object({
  caption: z.string().min(3).max(600),
  placeName: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  country: z.string().min(2).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  visitedAt: z.string().datetime(),
  taggedUserIds: z.array(z.string().cuid()).max(24).default([])
});

export const collectionSchema = z.object({
  name: z.string().trim().min(2).max(60)
});

export const collectionAssignmentSchema = z.object({
  collectionIds: z.array(z.string().cuid()).max(24).default([])
});

export const wantToGoPlaceSchema = z.object({
  placeName: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  country: z.string().min(2).max(80),
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
  city: z.string().min(2).max(80),
  country: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24)
});

export const placeSearchSchema = z.object({
  q: z.string().min(2).max(120)
});
