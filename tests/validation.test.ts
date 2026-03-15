import { describe, expect, test } from "vitest";
import { mapQuerySchema, postSchema, signUpSchema } from "@/lib/validation";

describe("schema validation", () => {
  test("sign up requires lowercase username pattern", () => {
    expect(
      signUpSchema.safeParse({
        name: "Avery Chen",
        username: "Avery",
        email: "avery@example.com",
        password: "password123"
      }).success
    ).toBe(false);
  });

  test("posts require valid location data", () => {
    expect(
      postSchema.safeParse({
        mediaType: "IMAGE",
        mediaUrl: "/uploads/example.jpg",
        thumbnailUrl: null,
        caption: "A full day in the city.",
        placeName: "Old Port",
        city: "Montreal",
        country: "Canada",
        latitude: 45.5,
        longitude: -73.55,
        visitedAt: new Date().toISOString()
      }).success
    ).toBe(true);
  });

  test("sign up password message uses password wording", () => {
    const result = signUpSchema.safeParse({
      name: "Avery Chen",
      username: "avery",
      email: "avery@example.com",
      password: "short"
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Password must be at least 8 characters.");
    }
  });

  test("map query parses defaults correctly", () => {
    const result = mapQuerySchema.safeParse({
      north: "49",
      south: "40",
      east: "-70",
      west: "-80",
      zoom: "5"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.layer).toBe("both");
      expect(result.data.time).toBe("all");
    }
  });

  test("map query parses group and category arrays from csv params", () => {
    const result = mapQuerySchema.safeParse({
      north: "49",
      south: "40",
      east: "-70",
      west: "-80",
      zoom: "6",
      groups: "cjf6x6q7m0000z6m5b3h9l3k1,cjf6x6q7m0001z6m5b3h9l3k2",
      categories: "photo,food"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.groups).toHaveLength(2);
      expect(result.data.categories).toEqual(["photo", "food"]);
    }
  });
});
