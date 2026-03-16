import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getCollectionRoutePoints } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { collectionId } = await params;
  const points = await getCollectionRoutePoints(session.user.id, collectionId);

  return Response.json({ points });
}
