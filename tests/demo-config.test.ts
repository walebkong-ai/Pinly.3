import { afterEach, describe, expect, test } from "vitest";
import { getDemoAvatarUrl } from "@/lib/demo-config";
import { TEST_AVATAR_URL } from "@/tests/fixtures/media";

const originalE2EMode = process.env.PINLY_E2E_MODE;
const originalDemoAvatarUrl = process.env.PINLY_DEMO_AVATAR_URL;

describe("demo config", () => {
  afterEach(() => {
    process.env.PINLY_E2E_MODE = originalE2EMode;
    process.env.PINLY_DEMO_AVATAR_URL = originalDemoAvatarUrl;
  });

  test("falls back to bundled demo avatars when no Supabase demo avatar is configured", () => {
    process.env.PINLY_E2E_MODE = "1";
    process.env.PINLY_DEMO_AVATAR_URL = "";

    expect(getDemoAvatarUrl("avery")).toBe("/demo-media/avatars/avery.svg");
  });

  test("uses a Supabase-hosted avatar when configured", () => {
    process.env.PINLY_E2E_MODE = "";
    process.env.PINLY_DEMO_AVATAR_URL = TEST_AVATAR_URL;

    expect(getDemoAvatarUrl("avery")).toBe(TEST_AVATAR_URL);
  });
});
