import { afterEach, describe, expect, test } from "vitest";
import { getDemoAvatarUrl } from "@/lib/demo-config";

const originalE2EMode = process.env.PINLY_E2E_MODE;

describe("demo config", () => {
  afterEach(() => {
    process.env.PINLY_E2E_MODE = originalE2EMode;
  });

  test("uses a local avatar asset during e2e runs", () => {
    process.env.PINLY_E2E_MODE = "1";

    expect(getDemoAvatarUrl("avery")).toBe("/pinly-globe-icon.svg");
  });

  test("uses the hosted avatar outside e2e mode", () => {
    process.env.PINLY_E2E_MODE = "";

    expect(getDemoAvatarUrl("avery")).toBe("https://api.dicebear.com/9.x/thumbs/svg?seed=avery");
  });
});
