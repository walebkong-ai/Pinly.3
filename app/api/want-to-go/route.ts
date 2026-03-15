import { auth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { wantToGoDeleteSchema, wantToGoPlaceSchema } from "@/lib/validation";
import { buildWantToGoPlaceKey } from "@/lib/want-to-go";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const placeKey = searchParams.get("key");

  if (!placeKey) {
    return Response.json({ item: null });
  }

  const item = await prisma.wantToGoPlace.findUnique({
    where: {
      userId_placeKey: {
        userId: session.user.id,
        placeKey
      }
    },
    select: {
      id: true,
      placeName: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true
    }
  });

  return Response.json({ item });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "WANT_TO_GO_INVALID_JSON" });
  }

  const parsed = wantToGoPlaceSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const placeKey = buildWantToGoPlaceKey(parsed.data);
  const existing = await prisma.wantToGoPlace.findUnique({
    where: {
      userId_placeKey: {
        userId: session.user.id,
        placeKey
      }
    },
    select: {
      id: true,
      placeName: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true
    }
  });

  if (existing) {
    return Response.json({ saved: true, item: existing });
  }

  try {
    const item = await prisma.wantToGoPlace.create({
      data: {
        userId: session.user.id,
        placeKey,
        placeName: parsed.data.placeName,
        city: parsed.data.city,
        country: parsed.data.country,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude
      },
      select: {
        id: true,
        placeName: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true
      }
    });

    return Response.json({ saved: true, item }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      const item = await prisma.wantToGoPlace.findUnique({
        where: {
          userId_placeKey: {
            userId: session.user.id,
            placeKey
          }
        },
        select: {
          id: true,
          placeName: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true
        }
      });

      return Response.json({ saved: true, item });
    }

    return apiError("Could not save this place.", 500);
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "WANT_TO_GO_DELETE_INVALID_JSON" });
  }

  const parsed = wantToGoDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  await prisma.wantToGoPlace.deleteMany({
    where: {
      id: parsed.data.itemId,
      userId: session.user.id
    }
  });

  return Response.json({ saved: false });
}
