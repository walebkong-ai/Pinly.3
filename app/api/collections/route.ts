import { auth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { collectionSchema } from "@/lib/validation";
import type { CollectionSummary } from "@/types/app";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const collections = await prisma.postCollection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      color: true,
      visibility: true as any,
      updatedAt: true,
      _count: {
        select: {
          posts: true
        }
      }
    } as any,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  return Response.json({
    collections: (collections ?? []).map((c: any) => ({
      ...c,
      visibility: c.visibility || "private",
      postCount: c._count?.posts || 0
    })) as CollectionSummary[]
  });
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
    return apiError("Invalid JSON payload.", 400, { code: "COLLECTION_INVALID_JSON" });
  }

  const parsed = collectionSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const name = parsed.data.name.trim();
  const color = parsed.data.color ?? null;

  const existing = await prisma.postCollection.findFirst({
    where: {
      userId: session.user.id,
      name: {
        equals: name,
        mode: "insensitive"
      }
    },
    select: {
      id: true,
      name: true,
      color: true,
      updatedAt: true,
      _count: {
        select: {
          posts: true
        }
      }
    }
  });

  if (existing) {
    return Response.json({
      created: false,
      collection: {
        id: existing.id,
        name: existing.name,
        color: existing.color ?? null,
        postCount: existing._count.posts,
        updatedAt: existing.updatedAt
      }
    });
  }

  const collection = await prisma.postCollection.create({
    data: {
      userId: session.user.id,
      name,
      color,
      visibility: (parsed.data.visibility as any) || "private"
    } as any,
    select: {
      id: true,
      name: true,
      color: true,
      visibility: true as any,
      updatedAt: true
    } as any
  });

  return Response.json(
    {
      created: true,
      collection: {
        ...collection,
        color: collection.color ?? null,
        postCount: 0
      }
    },
    { status: 201 }
  );
}
