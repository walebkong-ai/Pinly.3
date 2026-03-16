import { auth, unstable_update } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiValidationError } from "@/lib/api";
import { getPrismaErrorCode } from "@/lib/prisma-errors";
import { z } from "zod";
import { normalizedUsernameSchema } from "@/lib/validation";

const updateProfileSchema = z.object({
  username: normalizedUsernameSchema.optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal(""))
});

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload", 400);
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      avatarUrl: true
    }
  });

  if (!currentUser) {
    return apiError("Unauthorized", 401);
  }

  const { username, avatarUrl } = parsed.data;

  const updateData: any = {};

  if (username !== undefined) {
    if (username !== currentUser.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username,
          id: { not: currentUser.id }
        },
        select: { id: true }
      });

      if (existing) {
        return apiError("Username is already taken", 409);
      }

      updateData.username = username;
    }
  }

  if (avatarUrl !== undefined) {
    updateData.avatarUrl = avatarUrl === "" ? null : avatarUrl;
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ success: true });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        avatarUrl: true
      }
    });

    try {
      await unstable_update({
        user: {
          username: updatedUser.username,
          avatarUrl: updatedUser.avatarUrl
        }
      });
    } catch (error) {
      console.error("Failed to refresh auth session after profile update:", error);
    }

    return Response.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (err) {
    if (getPrismaErrorCode(err) === "P2002") {
      return apiError("Username is already taken", 409);
    }

    return apiError("Failed to update profile", 500);
  }
}
