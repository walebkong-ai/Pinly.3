import { describe, expect, test } from "vitest";
import { assertSafeSeedEnvironment } from "@/prisma/seed";

describe("seed safety", () => {
  test("blocks production seeding", () => {
    const previousNodeEnv = process.env.NODE_ENV;

    // @ts-expect-error
    process.env.NODE_ENV = "production";

    expect(() => assertSafeSeedEnvironment("postgresql://postgres:postgres@localhost:5432/pinly?schema=public")).toThrow(
      "Refusing to run the demo seed while NODE_ENV=production."
    );

    // @ts-expect-error
    process.env.NODE_ENV = previousNodeEnv;
  });

  test("blocks non-local seeding without explicit confirmation", () => {
    const previousConfirmation = process.env.ALLOW_DESTRUCTIVE_SEED;

    delete process.env.ALLOW_DESTRUCTIVE_SEED;

    expect(() =>
      assertSafeSeedEnvironment("postgresql://user:pass@ep-demo.us-east-1.aws.neon.tech/pinly?sslmode=require")
    ).toThrow("Refusing destructive seed against non-local database host");

    process.env.ALLOW_DESTRUCTIVE_SEED = previousConfirmation;
  });
});
