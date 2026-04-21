import { handlers } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
const { GET, POST: authPost } = handlers;

export { GET };

export async function POST(request: NextRequest) {
  const pathname = new URL(request.url).pathname;

  if (pathname.endsWith("/callback/credentials")) {
    const rateLimitResponse = await enforceRateLimit({
      scope: "auth-sign-in",
      request,
      limit: 10,
      windowMs: 15 * 60 * 1000
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  return authPost(request);
}
