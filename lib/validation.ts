import { z } from "zod";
import type { MapCategory } from "@/types/app";

const usernameRegex = /^[a-z0-9_]{3,20}$/;
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
  username: z.string().regex(usernameRegex, "Use 3-20 lowercase letters, numbers, or underscores"),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  avatarUrl: z.string().url().optional().or(z.literal(""))
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

export const friendRequestSchema = z.object({
  username: z.string().min(3).max(20).regex(usernameRegex, "Use a valid lowercase username")
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
  visitedAt: z.string().datetime()
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
