import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, signUpSchema } from "@/lib/validation";
import { apiError, apiValidationError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "REGISTER_INVALID_JSON" });
  }

  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const email = parsed.data.email.toLowerCase();
  const username = normalizeUsername(parsed.data.username);

  let existing;
  try {
    existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });
  } catch (error) {
    console.error("Database error during registration:", error);
    return apiError("Database connection failed. Please try again later.", 500);
  }

  if (existing) {
    if (existing.username === username) {
      return apiError("Username is already taken", 409);
    }
    return apiError("Email is already registered", 409);
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username,
        email,
        passwordHash: await hash(parsed.data.password, 10)
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true
      }
    });

    if (parsed.data.inviteToken) {
      const invite = await prisma.inviteLink.findUnique({
        where: { token: parsed.data.inviteToken }
      });

      if (invite && (!invite.expiresAt || invite.expiresAt > new Date())) {
        await prisma.friendship.create({
          data: {
            userAId: user.id,
            userBId: invite.createdByUserId
          }
        });
      }
    }
  } catch (error) {
    console.error("Database error creating user:", error);
    return apiError("Database connection failed. Please try again later.", 500);
  }

  return Response.json({ user }, { status: 201 });
}
