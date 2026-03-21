import { prisma } from "@/lib/prisma";
import { normalizeStoredMediaUrl } from "@/lib/media-url";
import { getRelationshipDetails, getVisibleUserIdsForViewer } from "@/lib/relationships";

export type AuthorizedMediaTarget =
  | {
      kind: "relative";
      url: string;
    }
  | {
      kind: "remote";
      url: string;
    };

async function canViewerAccessPostAsset(viewerId: string, url: string) {
  const matchingPost = await prisma.post.findFirst({
    where: {
      OR: [{ mediaUrl: url }, { thumbnailUrl: url }]
    },
    select: {
      userId: true,
      isArchived: true
    }
  });

  if (!matchingPost) {
    return false;
  }

  if (matchingPost.userId === viewerId) {
    return true;
  }

  if (matchingPost.isArchived) {
    return false;
  }

  const visibleUserIds = await getVisibleUserIdsForViewer(viewerId);
  return visibleUserIds.includes(matchingPost.userId);
}

async function canViewerAccessAvatar(viewerId: string, url: string) {
  const user = await prisma.user.findFirst({
    where: {
      avatarUrl: url
    },
    select: {
      id: true
    }
  });

  if (!user) {
    return false;
  }

  if (user.id === viewerId) {
    return true;
  }

  const relationship = await getRelationshipDetails(viewerId, user.id);
  return relationship.status !== "blocked";
}

export async function resolveAuthorizedMediaTarget(
  viewerId: string,
  requestedUrl: string | null | undefined
): Promise<AuthorizedMediaTarget | null> {
  const normalizedUrl = normalizeStoredMediaUrl(requestedUrl);

  if (!normalizedUrl) {
    return null;
  }

  if (normalizedUrl.startsWith("/")) {
    return {
      kind: "relative",
      url: normalizedUrl
    };
  }

  if (await canViewerAccessPostAsset(viewerId, normalizedUrl)) {
    return {
      kind: "remote",
      url: normalizedUrl
    };
  }

  if (await canViewerAccessAvatar(viewerId, normalizedUrl)) {
    return {
      kind: "remote",
      url: normalizedUrl
    };
  }

  return null;
}
