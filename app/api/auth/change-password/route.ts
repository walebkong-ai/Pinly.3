import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isReservedDemoEmail } from "@/lib/demo-config";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100)
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "change-password",
    request,
    userId: session.user.id,
    limit: 10,
    windowMs: 15 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, {
      maxBytes: 8 * 1024,
      invalidJsonCode: "CHANGE_PASSWORD_INVALID_JSON",
      invalidJsonMessage: "Invalid password payload."
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }

  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Passwords must be between 8 and 100 characters.", 400, {
      code: "CHANGE_PASSWORD_INVALID"
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      passwordHash: true
    }
  });

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (isReservedDemoEmail(user.email)) {
    return apiError("Reserved demo passwords cannot be changed.", 403, {
      code: "CHANGE_PASSWORD_DEMO_FORBIDDEN"
    });
  }

  const { currentPassword, newPassword } = parsed.data;
  const currentPasswordMatches = await compare(currentPassword, user.passwordHash);

  if (!currentPasswordMatches) {
    return apiError("Current password is incorrect.", 400, {
      code: "CHANGE_PASSWORD_CURRENT_INCORRECT"
    });
  }

  const passwordUnchanged = await compare(newPassword, user.passwordHash);

  if (passwordUnchanged) {
    return apiError("Choose a new password different from your current one.", 400, {
      code: "CHANGE_PASSWORD_UNCHANGED"
    });
  }

  const nextPasswordHash = await hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: nextPasswordHash
    }
  });

  await prisma.passwordResetToken.deleteMany({
    where: { email: user.email }
  });

  return Response.json({ success: true });
}
