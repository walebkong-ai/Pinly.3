import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validation";
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
  const username = parsed.data.username.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });

  if (existing) {
    return apiError("An account with that email or username already exists.", 409);
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username,
      email,
      passwordHash: await hash(parsed.data.password, 10),
      avatarUrl: parsed.data.avatarUrl || null
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true
    }
  });

  return Response.json({ user }, { status: 201 });
}
