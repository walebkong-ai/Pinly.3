import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getMapCollectionOverlays } from "@/lib/data";

export const runtime = "nodejs";

function parseLayer(value: string | null) {
  if (value === "friends" || value === "you" || value === "both") {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const layer = parseLayer(searchParams.get("layer"));

  if (!layer) {
    return apiError("Invalid collection overlay mode.", 400, { code: "MAP_COLLECTIONS_MODE_INVALID" });
  }

  const groups = (searchParams.get("groups") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const collections = await getMapCollectionOverlays({
    viewerId: session.user.id,
    layer,
    groups
  });

  return Response.json({ collections });
}
