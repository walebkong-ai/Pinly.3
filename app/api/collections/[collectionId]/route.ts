import { auth } from "@/lib/auth";
import { apiError, apiValidationError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { collectionUpdateSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { collectionId } = await params;
  const rateLimitResponse = await enforceRateLimit({
    scope: "collections-update",
    request,
    userId: session.user.id,
    key: collectionId,
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, {
      maxBytes: 8 * 1024,
      invalidJsonMessage: "Invalid JSON payload.",
      invalidJsonCode: "COLLECTION_UPDATE_INVALID_JSON"
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }

  const parsed = collectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  // Verify ownership
  const existing = await prisma.postCollection.findFirst({
    where: { id: collectionId, userId: session.user.id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("Collection not found.", 404);
  }

  const updateData: { name?: string; color?: string | null; visibility?: any } = {};
  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name.trim();
  }
  if (parsed.data.color !== undefined) {
    updateData.color = parsed.data.color ?? null;
  }
  if (parsed.data.visibility !== undefined) {
    updateData.visibility = parsed.data.visibility;
  }

  const updated = await prisma.postCollection.update({
    where: { id: collectionId },
    data: updateData,
    select: {
      id: true,
      name: true,
      color: true,
      visibility: true,
      updatedAt: true
    }
  });

  return Response.json({
    collection: {
      ...updated,
      color: updated.color ?? null
    }
  });
}
