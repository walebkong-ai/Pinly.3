import { describe, expect, test } from "vitest";
import { mapQuerySchema, postSchema, signUpSchema, wantToGoPlaceSchema } from "@/lib/validation";
import { TEST_IMAGE_URL } from "@/tests/fixtures/media";

describe("schema validation", () => {
  test("sign up requires lowercase username pattern", () => {
    expect(
      signUpSchema.safeParse({
        name: "Avery Chen",
        username: "Avery",
        email: "avery@example.com",
        password: "password123",
        acceptLegal: true
      }).success
    ).toBe(false);
  });

  test("posts require valid location data", () => {
    expect(
      postSchema.safeParse({
        mediaType: "IMAGE",
        mediaUrl: TEST_IMAGE_URL,
        thumbnailUrl: null,
        caption: "A full day in the city.",
        placeName: "Old Port",
        city: "Montreal",
        country: "Canada",
        latitude: 45.5,
        longitude: -73.55,
        visitedAt: new Date().toISOString(),
        taggedUserIds: ["cjf6x6q7m0000z6m5b3h9l3k1"],
        collectionIds: ["cjf6x6q7m0001z6m5b3h9l3k2"]
      }).success
    ).toBe(true);
  });

  test("posts default visited-with tags and collections to empty arrays", () => {
    const result = postSchema.safeParse({
      mediaType: "IMAGE",
      mediaUrl: TEST_IMAGE_URL,
      thumbnailUrl: null,
      caption: "Golden hour by the water.",
      placeName: "Harbourfront",
      city: "Toronto",
      country: "Canada",
      latitude: 43.64,
      longitude: -79.38,
      visitedAt: new Date().toISOString()
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.taggedUserIds).toEqual([]);
      expect(result.data.collectionIds).toEqual([]);
    }
  });

  test("sign up password message uses password wording", () => {
    const result = signUpSchema.safeParse({
      name: "Avery Chen",
      username: "avery",
      email: "avery@example.com",
      password: "short",
      acceptLegal: true
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

  test("want-to-go places require valid place coordinates", () => {
    expect(
      wantToGoPlaceSchema.safeParse({
        placeName: "Mount Royal",
        city: "Montreal",
        country: "Canada",
        latitude: 45.5048,
        longitude: -73.5878
      }).success
    ).toBe(true);
  });

  test("sign up requires legal acceptance", () => {
    const result = signUpSchema.safeParse({
      name: "Avery Chen",
      username: "avery",
      email: "avery@example.com",
      password: "password123",
      acceptLegal: false
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("You must accept the Terms of Service and Privacy Policy.");
    }
  });
});
