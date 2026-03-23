import { prisma } from "@/lib/prisma";
import { normalizeProfileImageUrl, normalizeStoredMediaUrl } from "@/lib/media-url";

type LegacyPostRecord = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  isArchived: boolean;
};

function readOptionalStoredMediaUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = normalizeStoredMediaUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function readOptionalProfileMediaUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = normalizeProfileImageUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function getPostRepairData(post: LegacyPostRecord) {
  const normalizedMediaUrl = normalizeStoredMediaUrl(post.mediaUrl);
  const normalizedThumbnailUrl =
    post.thumbnailUrl === null ? null : normalizeStoredMediaUrl(post.thumbnailUrl);
  const fallbackImageUrl = readOptionalStoredMediaUrl(
    process.env.PINLY_FALLBACK_IMAGE_URL,
    process.env.PINLY_DEMO_IMAGE_URL
  );
  const fallbackVideoUrl = readOptionalStoredMediaUrl(
    process.env.PINLY_FALLBACK_VIDEO_URL,
    process.env.PINLY_DEMO_VIDEO_URL
  );
  const fallbackVideoThumbnailUrl = readOptionalStoredMediaUrl(
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
        mediaUrl: fallbackVideoUrl,
        thumbnailUrl: fallbackVideoThumbnailUrl
      },
      repaired: true,
      archived: false
    };
  }

  if (post.mediaType === "IMAGE" && fallbackImageUrl) {
    return {
      data: {
        mediaUrl: fallbackImageUrl,
        thumbnailUrl: null
      },
      repaired: true,
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

async function main() {
  const apply = process.argv.includes("--apply");
  const fallbackAvatarUrl = readOptionalProfileMediaUrl(
    process.env.PINLY_FALLBACK_AVATAR_URL,
    process.env.PINLY_DEMO_AVATAR_URL
  );
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
    }
  });
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
      isArchived: true
    }
  });

  const invalidUsers = users.filter((user) => normalizeProfileImageUrl(user.avatarUrl) === null);
  const postRepairs = posts
    .map((post) => ({
      post,
      repair: getPostRepairData(post)
    }))
    .filter(({ repair }) => repair.repaired);

  console.log("Pinly media repair audit");
  console.log("=======================");
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`Invalid avatar rows: ${invalidUsers.length}`);
  console.log(`Post rows needing repair: ${postRepairs.length}`);
  console.log(`Fallback avatar URL: ${fallbackAvatarUrl ?? "(none; invalid avatars will be cleared)"}`);
  console.log(
    `Fallback image URL: ${readOptionalStoredMediaUrl(process.env.PINLY_FALLBACK_IMAGE_URL, process.env.PINLY_DEMO_IMAGE_URL) ?? "(none)"}`
  );
  console.log(
    `Fallback video URL: ${readOptionalStoredMediaUrl(process.env.PINLY_FALLBACK_VIDEO_URL, process.env.PINLY_DEMO_VIDEO_URL) ?? "(none)"}`
  );

  if (!apply) {
    return;
  }

  if (invalidUsers.length > 0) {
    await prisma.user.updateMany({
      where: {
        id: {
          in: invalidUsers.map((user) => user.id)
        }
      },
      data: {
        avatarUrl: fallbackAvatarUrl
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
  console.log(`Updated invalid avatars: ${invalidUsers.length}`);
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
