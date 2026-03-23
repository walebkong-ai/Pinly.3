import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import {
  AccountDeletionNotFoundError,
  DemoAccountDeletionNotAllowedError,
  deleteAccount
} from "@/lib/account-deletion";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const accountDeletionSchema = z.object({
  confirmation: z.string().trim().toUpperCase()
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "account-delete",
    request,
    userId: session.user.id,
    limit: 3,
    windowMs: 60 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, {
      code: "ACCOUNT_DELETE_INVALID_JSON"
    });
  }

  const parsed = accountDeletionSchema.safeParse(body);

  if (!parsed.success || parsed.data.confirmation !== "DELETE") {
    return apiError("Type DELETE to confirm permanent account removal.", 400, {
      code: "ACCOUNT_DELETE_CONFIRMATION_REQUIRED"
    });
  }

  try {
    const summary = await deleteAccount(session.user.id);

    return Response.json({
      success: true,
      summary
    });
  } catch (error) {
    if (error instanceof DemoAccountDeletionNotAllowedError) {
      return apiError("Reserved demo accounts cannot be deleted.", 403, {
        code: "ACCOUNT_DELETE_DEMO_FORBIDDEN"
      });
    }

    if (error instanceof AccountDeletionNotFoundError) {
      return apiError("Unauthorized", 401);
    }

    console.error("Account deletion failed:", error);

    return apiError("Could not delete account.", 500, {
      code: "ACCOUNT_DELETE_FAILED"
    });
  }
}
