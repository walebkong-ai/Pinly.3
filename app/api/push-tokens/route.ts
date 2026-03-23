import { auth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { pushTokenSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "PUSH_TOKEN_INVALID_JSON" });
  }

  const parsed = pushTokenSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const pushToken = await prisma.pushToken.upsert({
    where: {
      token: parsed.data.token
    },
    create: {
      token: parsed.data.token,
      platform: parsed.data.platform,
      userId: session.user.id
    },
    update: {
      platform: parsed.data.platform,
      userId: session.user.id
    },
    select: {
      token: true,
      platform: true,
      userId: true
    }
  });

  return Response.json({
    ok: true,
    pushToken
  });
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return apiError("Missing token.", 400, { code: "PUSH_TOKEN_MISSING" });
  }

  await prisma.pushToken.deleteMany({
    where: {
      token,
      userId: session.user.id
    }
  });

  return Response.json({ ok: true });
}
