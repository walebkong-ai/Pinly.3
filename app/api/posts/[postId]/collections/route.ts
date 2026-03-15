import { auth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { collectionAssignmentSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "POST_COLLECTIONS_INVALID_JSON" });
  }

  const parsed = collectionAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const { postId } = await params;
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true }
  });

  if (!post) {
    return apiError("Post not found.", 404);
  }

  if (post.userId !== session.user.id) {
    return apiError("Only the post owner can manage collections.", 403);
  }

  const collectionIds = Array.from(new Set(parsed.data.collectionIds));
  const collections = await prisma.postCollection.findMany({
    where: {
      userId: session.user.id,
      id: { in: collectionIds }
    },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: "asc" }
  });

  if (collections.length !== collectionIds.length) {
    return apiError("You can only save memories into your own collections.", 403);
  }

  const existingEntries = await prisma.postCollectionItem.findMany({
    where: { postId },
    select: { collectionId: true }
  });
  const existingIds = new Set(existingEntries.map((entry) => entry.collectionId));
  const nextIds = new Set(collectionIds);

  const collectionIdsToAdd = collectionIds.filter((collectionId) => !existingIds.has(collectionId));
  const collectionIdsToRemove = existingEntries
    .map((entry) => entry.collectionId)
    .filter((collectionId) => !nextIds.has(collectionId));
  const touchedCollectionIds = Array.from(new Set([...collectionIdsToAdd, ...collectionIdsToRemove]));

  const operations: Prisma.PrismaPromise<unknown>[] = [];

  if (collectionIdsToRemove.length > 0) {
    operations.push(
      prisma.postCollectionItem.deleteMany({
        where: {
          postId,
          collectionId: { in: collectionIdsToRemove }
        }
      })
    );
  }

  if (collectionIdsToAdd.length > 0) {
    operations.push(
      prisma.postCollectionItem.createMany({
        data: collectionIdsToAdd.map((collectionId) => ({
          postId,
          collectionId
        })),
        skipDuplicates: true
      })
    );
  }

  if (touchedCollectionIds.length > 0) {
    operations.push(
      prisma.postCollection.updateMany({
        where: {
          userId: session.user.id,
          id: { in: touchedCollectionIds }
        },
        data: {
          updatedAt: new Date()
        }
      })
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return Response.json({
    collections
  });
}
