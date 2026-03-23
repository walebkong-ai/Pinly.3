import "dotenv/config";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { prisma } from "@/lib/prisma";
import {
  buildSupabasePublicMediaUrl,
  createSupabaseAdminClient,
  getSupabaseRuntimeDiagnostics,
  getSupabaseStorageBucket,
  getSupabaseServiceRoleKey
} from "@/lib/supabase-storage";
import { classifyLegacyMediaUrl, type LegacyMediaSource } from "@/lib/legacy-media";
import { normalizeProfileImageUrl, normalizeStoredMediaUrl } from "@/lib/media-url";

const execFileAsync = promisify(execFile);
const REMOTE_MIGRATION_CONFIRMATION_TOKEN = "pinly-legacy-media";
const REMOTE_MIGRATION_CONFIRM_ENV = "ALLOW_REMOTE_MEDIA_MIGRATION";

type LegacyPostRow = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  isArchived: boolean;
};

type LegacyAvatarRow = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

type AuditCounts = Map<string, number>;

function incrementCount(counts: AuditCounts, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function parseLimitArg() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));

  if (!limitArg) {
    return null;
  }

  const parsed = Number(limitArg.split("=")[1] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function assertSafeLegacyMediaMigrationEnvironment(apply: boolean) {
  if (!apply) {
    return;
  }

  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

  if (!databaseUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL must be set before migrating legacy media.");
  }

  const parsed = new URL(databaseUrl);
  const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (!isLocalHost && process.env[REMOTE_MIGRATION_CONFIRM_ENV] !== REMOTE_MIGRATION_CONFIRMATION_TOKEN) {
    throw new Error(
      `Refusing to migrate legacy media against non-local database host "${parsed.hostname}". Re-run with ${REMOTE_MIGRATION_CONFIRM_ENV}=${REMOTE_MIGRATION_CONFIRMATION_TOKEN} if you intentionally want to update a remote Pinly database.`
    );
  }
}

function getNormalizedContentType(value: string | null | undefined) {
  const trimmed = value?.split(";")[0]?.trim().toLowerCase() ?? "";
  return trimmed || null;
}

function inferSupportedContentType(extension: string | null) {
  switch (extension) {
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "mov":
    case "qt":
      return "video/quicktime";
    case "mp4":
      return "video/mp4";
    case "png":
      return "image/png";
    case "webm":
      return "video/webm";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}

function inferExtensionFromContentType(contentType: string | null) {
  switch (contentType) {
    case "image/gif":
      return "gif";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return null;
  }
}

async function convertHeicBufferToJpeg(buffer: Buffer) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "pinly-heic-"));
  const inputPath = path.join(tempDir, `${randomUUID()}.heic`);
  const outputPath = path.join(tempDir, `${randomUUID()}.jpg`);

  try {
    await writeFile(inputPath, buffer);
    await execFileAsync("sips", ["-s", "format", "jpeg", inputPath, "--out", outputPath]);
    const converted = await readFile(outputPath);

    return {
      buffer: converted,
      contentType: "image/jpeg" as const,
      extension: "jpg" as const
    };
  } catch {
    return null;
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }
}

async function downloadLegacyAsset(source: LegacyMediaSource) {
  const response = await fetch(source.uploadSourceUrl, {
    method: "GET",
    redirect: "follow"
  });

  if (!response.ok) {
    return null;
  }

  const responseContentType = getNormalizedContentType(response.headers.get("content-type"));
  const rawBuffer = Buffer.from(await response.arrayBuffer());

  if (source.category === "vercel_blob_heic") {
    return convertHeicBufferToJpeg(rawBuffer);
  }

  const contentType = responseContentType ?? source.suggestedContentType;
  const extension = inferExtensionFromContentType(contentType) ?? source.extension;
  const supportedContentType = contentType ?? inferSupportedContentType(extension);

  if (!supportedContentType || !extension) {
    return null;
  }

  return {
    buffer: rawBuffer,
    contentType: supportedContentType,
    extension
  };
}

async function uploadLegacyAsset(
  objectPath: string,
  asset: { buffer: Buffer; contentType: string; extension: string },
  bucket: string
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(objectPath, new Uint8Array(asset.buffer), {
    contentType: asset.contentType,
    upsert: true
  });

  if (error) {
    throw new Error(`Supabase storage upload failed for "${objectPath}": ${error.message}`);
  }

  return buildSupabasePublicMediaUrl(objectPath, bucket);
}

function buildLegacyObjectPath(kind: "avatar" | "post" | "thumbnail", id: string, extension: string) {
  switch (kind) {
    case "avatar":
      return `legacy/avatars/${id}.${extension}`;
    case "thumbnail":
      return `legacy/thumbnails/${id}.${extension}`;
    default:
      return `legacy/posts/${id}.${extension}`;
  }
}

async function migrateAvatar(
  user: LegacyAvatarRow,
  apply: boolean,
  bucket: string,
  counts: AuditCounts
) {
  if (!user.avatarUrl || normalizeProfileImageUrl(user.avatarUrl)) {
    return;
  }

  const source = classifyLegacyMediaUrl(user.avatarUrl, "avatar");

  if (!source) {
    incrementCount(counts, "avatar:unsupported");

    if (apply) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: null }
      });
      incrementCount(counts, "avatar:cleared");
    }

    return;
  }

  incrementCount(counts, `avatar:${source.category}`);

  const asset = await downloadLegacyAsset(source);

  if (!asset) {
    incrementCount(counts, `avatar:${source.category}:unrecoverable`);

    if (apply) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: null }
      });
      incrementCount(counts, "avatar:cleared");
    }

    return;
  }

  incrementCount(counts, `avatar:${source.category}:recoverable`);

  if (!apply) {
    return;
  }

  const avatarUrl = await uploadLegacyAsset(buildLegacyObjectPath("avatar", user.id, asset.extension), asset, bucket);
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl }
  });
  incrementCount(counts, "avatar:migrated");
}

async function migratePost(
  post: LegacyPostRow,
  apply: boolean,
  bucket: string,
  counts: AuditCounts
) {
  if (normalizeStoredMediaUrl(post.mediaUrl)) {
    return;
  }

  const mediaSource = classifyLegacyMediaUrl(post.mediaUrl, "post");

  if (!mediaSource) {
    incrementCount(counts, "post:unsupported");

    if (apply && !post.isArchived) {
      await prisma.post.update({
        where: { id: post.id },
        data: { isArchived: true }
      });
      incrementCount(counts, "post:archived");
    }

    return;
  }

  incrementCount(counts, `post:${mediaSource.category}`);

  const mediaAsset = await downloadLegacyAsset(mediaSource);

  if (!mediaAsset) {
    incrementCount(counts, `post:${mediaSource.category}:unrecoverable`);

    if (apply && !post.isArchived) {
      await prisma.post.update({
        where: { id: post.id },
        data: { isArchived: true }
      });
      incrementCount(counts, "post:archived");
    }

    return;
  }

  incrementCount(counts, `post:${mediaSource.category}:recoverable`);

  let thumbnailUrl: string | null = null;

  if (post.thumbnailUrl && !normalizeStoredMediaUrl(post.thumbnailUrl)) {
    const thumbnailSource = classifyLegacyMediaUrl(post.thumbnailUrl, "post");

    if (thumbnailSource) {
      incrementCount(counts, `thumbnail:${thumbnailSource.category}`);
      const thumbnailAsset = await downloadLegacyAsset(thumbnailSource);

      if (thumbnailAsset) {
        incrementCount(counts, `thumbnail:${thumbnailSource.category}:recoverable`);

        if (apply) {
          thumbnailUrl = await uploadLegacyAsset(
            buildLegacyObjectPath("thumbnail", post.id, thumbnailAsset.extension),
            thumbnailAsset,
            bucket
          );
        }
      } else {
        incrementCount(counts, `thumbnail:${thumbnailSource.category}:unrecoverable`);
      }
    } else {
      incrementCount(counts, "thumbnail:unsupported");
    }
  } else if (post.thumbnailUrl) {
    thumbnailUrl = post.thumbnailUrl;
  }

  if (!apply) {
    return;
  }

  const mediaUrl = await uploadLegacyAsset(buildLegacyObjectPath("post", post.id, mediaAsset.extension), mediaAsset, bucket);
  await prisma.post.update({
    where: { id: post.id },
    data: {
      mediaType: mediaAsset.contentType.startsWith("video/") ? "VIDEO" : "IMAGE",
      mediaUrl,
      thumbnailUrl,
      isArchived: false
    }
  });
  incrementCount(counts, "post:migrated");
}

function printSummary(counts: AuditCounts, apply: boolean) {
  const orderedEntries = Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right));

  console.log("Pinly legacy media migration");
  console.log("============================");
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);

  for (const [key, value] of orderedEntries) {
    console.log(`${key}: ${value}`);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limit = parseLimitArg();

  assertSafeLegacyMediaMigrationEnvironment(apply);

  const diagnostics = getSupabaseRuntimeDiagnostics();
  const counts = new Map<string, number>();
  const bucket = getSupabaseStorageBucket();

  if (apply) {
    getSupabaseServiceRoleKey();
  }

  console.log("Pinly legacy media runtime");
  console.log("==========================");
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        limit,
        bucket,
        hasNextPublicSupabaseUrl: diagnostics.hasNextPublicSupabaseUrl,
        hasNextPublicSupabaseAnonKey: diagnostics.hasNextPublicSupabaseAnonKey,
        hasServerSupabaseUrl: diagnostics.hasServerSupabaseUrl,
        hasServerSupabaseAnonKey: diagnostics.hasServerSupabaseAnonKey,
        hasSupabaseServiceRoleKey: diagnostics.hasSupabaseServiceRoleKey
      },
      null,
      2
    )
  );

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
      isArchived: true
    },
    take: limit ?? undefined,
    orderBy: {
      createdAt: "asc"
    }
  });

  const users = await prisma.user.findMany({
    where: {
      avatarUrl: {
        not: null
      }
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true
    },
    take: limit ?? undefined,
    orderBy: {
      createdAt: "asc"
    }
  });

  for (const user of users) {
    await migrateAvatar(user, apply, bucket, counts);
  }

  for (const post of posts) {
    await migratePost(post, apply, bucket, counts);
  }

  printSummary(counts, apply);
}

void main()
  .catch((error) => {
    console.error("Pinly legacy media migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
