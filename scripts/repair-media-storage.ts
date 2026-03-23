import { prisma } from "@/lib/prisma";
import { getDemoAvatarUrl, isReservedDemoEmail } from "@/lib/demo-config";
import {
  getBundledDemoPostImageUrl,
  isTrustedBundledDemoAvatarPath,
  isTrustedBundledDemoMediaPath
} from "@/lib/demo-media";
import { normalizeProfileImageUrl, normalizeStoredMediaUrl } from "@/lib/media-url";

type LegacyPostRecord = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  isArchived: boolean;
  placeName: string;
  city: string;
  country: string;
};

function readOptionalRepairablePostMediaUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalizedStoredUrl = normalizeStoredMediaUrl(candidate);

    if (normalizedStoredUrl) {
      return normalizedStoredUrl;
    }

    if (isTrustedBundledDemoMediaPath(candidate)) {
      return candidate?.trim() ?? null;
    }
  }

  return null;
}

function readOptionalRepairableProfileMediaUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalizedProfileUrl = normalizeProfileImageUrl(candidate);

    if (normalizedProfileUrl) {
      return normalizedProfileUrl;
    }

    if (isTrustedBundledDemoAvatarPath(candidate)) {
      return candidate?.trim() ?? null;
    }
  }

  return null;
}

function getPostRepairData(post: LegacyPostRecord) {
  const normalizedMediaUrl = normalizeStoredMediaUrl(post.mediaUrl);
  const normalizedThumbnailUrl =
    post.thumbnailUrl === null ? null : normalizeStoredMediaUrl(post.thumbnailUrl);
  const bundledImageUrl = getBundledDemoPostImageUrl(`${post.placeName}|${post.city}|${post.country}|${post.id}`);
  const fallbackImageUrl = readOptionalRepairablePostMediaUrl(
    process.env.PINLY_FALLBACK_IMAGE_URL,
    process.env.PINLY_DEMO_IMAGE_URL,
    bundledImageUrl
  );
  const fallbackVideoUrl = readOptionalRepairablePostMediaUrl(
    process.env.PINLY_FALLBACK_VIDEO_URL,
    process.env.PINLY_DEMO_VIDEO_URL
  );
  const fallbackVideoThumbnailUrl = readOptionalRepairablePostMediaUrl(
    process.env.PINLY_FALLBACK_VIDEO_THUMBNAIL_URL,
    process.env.PINLY_DEMO_VIDEO_THUMBNAIL_URL
  );

  if (normalizedMediaUrl) {
    return {
      data: {
        mediaUrl: normalizedMediaUrl,
        thumbnailUrl: normalizedThumbnailUrl
      },
      repaired: normalizedMediaUrl !== post.mediaUrl || normalizedThumbnailUrl !== post.thumbnailUrl,
      archived: false
    };
  }

  if (post.mediaType === "VIDEO" && fallbackVideoUrl) {
    return {
      data: {
        mediaType: "VIDEO" as const,
        mediaUrl: fallbackVideoUrl,
        thumbnailUrl: fallbackVideoThumbnailUrl,
        isArchived: false
      },
      repaired:
        post.mediaUrl !== fallbackVideoUrl ||
        post.thumbnailUrl !== fallbackVideoThumbnailUrl ||
        post.isArchived,
      archived: false
    };
  }

  if (fallbackImageUrl) {
    return {
      data: {
        mediaType: "IMAGE" as const,
        mediaUrl: fallbackImageUrl,
        thumbnailUrl: null,
        isArchived: false
      },
      repaired:
        post.mediaType !== "IMAGE" ||
        post.mediaUrl !== fallbackImageUrl ||
        post.thumbnailUrl !== null ||
        post.isArchived,
      archived: false
    };
  }

  return {
    data: {
      isArchived: true
    },
    repaired: !post.isArchived,
    archived: true
  };
}

function getAvatarRepairValue(
  user: { email: string; username: string; avatarUrl: string | null },
  fallbackAvatarUrl: string | null
) {
  const normalizedAvatarUrl = normalizeProfileImageUrl(user.avatarUrl);

  if (normalizedAvatarUrl) {
    return normalizedAvatarUrl === user.avatarUrl ? undefined : normalizedAvatarUrl;
  }

  if (isReservedDemoEmail(user.email)) {
    return getDemoAvatarUrl(user.username);
  }

  if (user.avatarUrl === null) {
    return undefined;
  }

  return fallbackAvatarUrl;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const fallbackAvatarUrl = readOptionalRepairableProfileMediaUrl(
    process.env.PINLY_FALLBACK_AVATAR_URL,
    process.env.PINLY_DEMO_AVATAR_URL,
    getDemoAvatarUrl("pinly")
  );
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true
    }
  });
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
      isArchived: true,
      placeName: true,
      city: true,
      country: true
    }
  });

  const avatarRepairs = users
    .map((user) => ({
      user,
      nextAvatarUrl: getAvatarRepairValue(user, fallbackAvatarUrl)
    }))
    .filter(({ user, nextAvatarUrl }) => nextAvatarUrl !== undefined && nextAvatarUrl !== user.avatarUrl);
  const postRepairs = posts
    .map((post) => ({
      post,
      repair: getPostRepairData(post)
    }))
    .filter(({ repair }) => repair.repaired);

  console.log("Pinly media repair audit");
  console.log("=======================");
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`Avatar rows needing repair: ${avatarRepairs.length}`);
  console.log(`Post rows needing repair: ${postRepairs.length}`);
  console.log(`Fallback avatar URL: ${fallbackAvatarUrl ?? "(none; invalid avatars will be cleared)"}`);
  console.log(
    `Fallback image URL: ${
      readOptionalRepairablePostMediaUrl(
        process.env.PINLY_FALLBACK_IMAGE_URL,
        process.env.PINLY_DEMO_IMAGE_URL,
        getBundledDemoPostImageUrl("pinly-fallback-image")
      ) ?? "(none)"
    }`
  );
  console.log(
    `Fallback video URL: ${
      readOptionalRepairablePostMediaUrl(process.env.PINLY_FALLBACK_VIDEO_URL, process.env.PINLY_DEMO_VIDEO_URL) ??
      "(none)"
    }`
  );

  if (!apply) {
    return;
  }

  for (const { user, nextAvatarUrl } of avatarRepairs) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: nextAvatarUrl
      }
    });
  }

  for (const { post, repair } of postRepairs) {
    await prisma.post.update({
      where: { id: post.id },
      data: repair.data
    });
  }

  const archivedPostCount = postRepairs.filter(({ repair }) => repair.archived).length;
  console.log(`Updated avatar rows: ${avatarRepairs.length}`);
  console.log(`Updated post rows: ${postRepairs.length - archivedPostCount}`);
  console.log(`Archived unrecoverable posts: ${archivedPostCount}`);
}

void main()
  .catch((error) => {
    console.error("Pinly media repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
