import { expect, type APIRequestContext } from "@playwright/test";

const E2E_RESET_PATH = "/api/test/reset-demo";
const E2E_SECRET = process.env.PINLY_E2E_SECRET ?? "pinly-e2e-secret";

export async function resetDemoAppState(request: APIRequestContext) {
  const response = await request.post(E2E_RESET_PATH, {
    headers: {
      "x-pinly-e2e-secret": E2E_SECRET
    }
  });

  expect(response.status(), `Expected ${E2E_RESET_PATH} to succeed.`).toBe(200);
}
