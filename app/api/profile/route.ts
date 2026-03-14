import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiValidationError } from "@/lib/api";
import { z } from "zod";
import { usernameRegex } from "@/lib/validation";

const updateProfileSchema = z.object({
  username: z
    .string()
    .regex(usernameRegex, "Use 3-20 lowercase letters, numbers, underscores, or hyphens")
    .optional(),
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

  const { username, avatarUrl } = parsed.data;

  const updateData: any = {};

  if (username !== undefined) {
    const normalizedUsername = username.toLowerCase();
    
    if (normalizedUsername !== session.user.username) {
      // Check for uniqueness
      const existing = await prisma.user.findUnique({
        where: { username: normalizedUsername }
      });
      if (existing) {
        return apiError("Username is already taken", 409);
      }
      updateData.username = normalizedUsername;
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
      data: updateData
    });

    return Response.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl
      }
    });
  } catch (err) {
    return apiError("Failed to update profile", 500);
  }
}
