import fs from "node:fs/promises";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { resolveAuthorizedMediaTarget } from "@/lib/media-authorization";
import { getLocalUploadContentType, resolveLocalUploadPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { path } = await params;
  const requestedUrl = `/uploads/${path.join("/")}`;
  const target = await resolveAuthorizedMediaTarget(session.user.id, requestedUrl);

  if (!target || target.kind !== "relative") {
    return apiError("Media not found", 404, { code: "MEDIA_NOT_FOUND" });
  }

  const localPath = resolveLocalUploadPath(target.url);

  if (!localPath) {
    return apiError("Media not found", 404, { code: "MEDIA_NOT_FOUND" });
  }

  try {
    const [fileBuffer, stats] = await Promise.all([fs.readFile(localPath), fs.stat(localPath)]);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "cache-control": "private, max-age=60",
        "content-length": String(stats.size),
        "content-type": getLocalUploadContentType(target.url)
      }
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return apiError("Media not found", 404, { code: "MEDIA_NOT_FOUND" });
    }

    return apiError("Failed to read media.", 500, {
      code: "MEDIA_READ_FAILED",
      details: error instanceof Error ? error.message : "Unknown media read failure"
    });
  }
}
