import { filterPostsByCategories } from "@/lib/map-filters";
import { resolveLayerUserIds } from "@/lib/map-groups";
import { FULL_WORLD_BOUNDS, getBoundsCenter, getLongitudeFilter, normalizeMapBounds } from "@/lib/map-viewport";
import { Prisma } from "@prisma/client";
import { getMapStage, getTimeFilterStart, buildLayerUserIds, buildMapPayload } from "@/lib/map-data";
import { prisma } from "@/lib/prisma";
import { buildVisibleUserIds } from "@/lib/permissions";
import { buildProfileTravelSummary } from "@/lib/profile-summary";
import { buildWantToGoPlaceKey, type WantToGoLocation } from "@/lib/want-to-go";
import { notificationInclude } from "@/lib/notifications";
import type { CollectionChip, CollectionSummary, LayerMode, MapCategory, NotificationSummary, TimeFilter, WantToGoPlaceSummary } from "@/types/app";

export const postSummaryInclude = Prisma.validator<Prisma.PostInclude>()({
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      settings: {
        select: {
          commentsEnabled: true
        }
      }
    }
  },
  visitedWith: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true
        }
      }
    }
  }
});

type IncludedPost = Prisma.PostGetPayload<{
  include: typeof postSummaryInclude;
}>;

const collectionSummaryInclude = Prisma.validator<Prisma.PostCollectionInclude>()({
  _count: {
    select: {
      posts: true
    }
  },
  posts: {
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      post: {
        select: {
          id: true,
          mediaType: true,
          mediaUrl: true,
          thumbnailUrl: true,
          placeName: true,
          city: true,
          country: true
        }
      }
    }
  }
});

type IncludedCollection = Prisma.PostCollectionGetPayload<{
  include: typeof collectionSummaryInclude;
}>;

type IncludedNotification = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

function normalizeCollectionSummary(collection: IncludedCollection): CollectionSummary {
  return {
    id: collection.id,
    name: collection.name,
    postCount: collection._count.posts,
    updatedAt: collection.updatedAt,
    previewPost: collection.posts[0]?.post ?? null
  };
}

async function getSavedPostIdSet(viewerId: string, postIds: string[]) {
  if (postIds.length === 0) {
    return new Set<string>();
  }

  try {
    const savedPosts = await prisma.savedPost.findMany({
      where: {
        userId: viewerId,
        postId: { in: postIds }
      },
      select: {
        postId: true
      }
    });

    return new Set(savedPosts.map((save) => save.postId));
  } catch {
    // The saved-posts migration may not be applied yet in every environment.
    return new Set<string>();
  }
}

async function attachSavedState(viewerId: string, posts: IncludedPost[]) {
  const savedPostIds = await getSavedPostIdSet(
    viewerId,
    posts.map((post) => post.id)
  );

  return posts.map((post) => ({
    ...post,
    visitedWith: post.visitedWith.map((tag) => tag.user),
    savedByViewer: savedPostIds.has(post.id)
  }));
}

function normalizePostSummaries(posts: IncludedPost[]) {
  return posts.map((post) => ({
    ...post,
    visitedWith: post.visitedWith.map((tag) => tag.user)
  }));
}

export async function getVisibleUserIds(viewerId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: viewerId }, { userBId: viewerId }]
    }
  });

  return buildVisibleUserIds(viewerId, friendships);
}

export async function getFriendIds(viewerId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: viewerId }, { userBId: viewerId }]
    }
  });

  return friendships.map((friendship) => (friendship.userAId === viewerId ? friendship.userBId : friendship.userAId));
}

export async function getLayerUserIds(viewerId: string, layer: LayerMode) {
  const friendIds = await getFriendIds(viewerId);

  return buildLayerUserIds(viewerId, friendIds, layer);
}

export async function getMapData({
  viewerId,
  bounds,
  query,
  zoom,
  layer,
  time,
  groups,
  categories
}: {
  viewerId: string;
  bounds: { north: number; south: number; east: number; west: number };
  zoom: number;
  layer: LayerMode;
  time: TimeFilter;
  groups: string[];
  categories: MapCategory[];
  query?: string;
}) {
  const friendIds = await getFriendIds(viewerId);
  const scopedUserIds = resolveLayerUserIds({
    viewerId,
    friendIds,
    selectedGroupIds: groups,
    layer
  });
  const visitedAfter = getTimeFilterStart(time);
  const normalizedBounds = normalizeMapBounds(bounds);
  const queryBounds = getMapStage(zoom) === "world" ? FULL_WORLD_BOUNDS : normalizedBounds;
  const longitudeFilter = getLongitudeFilter(queryBounds);
  const whereClauses: Prisma.PostWhereInput[] = [
    {
      userId: { in: scopedUserIds }
    },
    {
      latitude: { lte: queryBounds.north, gte: queryBounds.south }
    }
  ];

  if (longitudeFilter.kind === "between") {
    whereClauses.push({
      longitude: { lte: longitudeFilter.east, gte: longitudeFilter.west }
    });
  } else if (longitudeFilter.kind === "wrapped") {
    whereClauses.push({
      OR: [
        { longitude: { gte: longitudeFilter.west } },
        { longitude: { lte: longitudeFilter.east } }
      ]
    });
  }

  if (visitedAfter) {
    whereClauses.push({
      visitedAt: { gte: visitedAfter }
    });
  }

  if (query) {
    whereClauses.push({
      OR: [
        { placeName: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { country: { contains: query, mode: "insensitive" } },
        { caption: { contains: query, mode: "insensitive" } },
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { username: { contains: query, mode: "insensitive" } } }
      ]
    });
  }

  const posts = await prisma.post.findMany({
    where: {
      AND: whereClauses
    },
    include: postSummaryInclude,
    orderBy: [{ visitedAt: "desc" }],
    take: 500
  });

  const filteredPosts = filterPostsByCategories(normalizePostSummaries(posts), categories);

  return buildMapPayload({
    posts: filteredPosts,
    zoom,
    center: getBoundsCenter(normalizedBounds),
    viewerId
  });
}

export async function getCityData({
  viewerId,
  city,
  country,
  page = 1,
  pageSize = 24
}: {
  viewerId: string;
  city: string;
  country?: string;
  page?: number;
  pageSize?: number;
}) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  const posts = await prisma.post.findMany({
    where: {
      userId: { in: visibleUserIds },
      city: { equals: city, mode: "insensitive" },
      ...(country ? { country: { equals: country, mode: "insensitive" } } : {})
    },
    include: postSummaryInclude,
    orderBy: { visitedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  const savedPosts = await attachSavedState(viewerId, posts);

  const center = savedPosts.reduce(
    (acc, post, index) => ({
      latitude: acc.latitude + (post.latitude - acc.latitude) / (index + 1),
      longitude: acc.longitude + (post.longitude - acc.longitude) / (index + 1)
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    posts: savedPosts,
    friendCount: new Set(savedPosts.filter((post) => post.userId !== viewerId).map((post) => post.userId)).size,
    center,
    visitors: Array.from(
      new Map(savedPosts.map((post) => [post.user.id, post.user])).values()
    ),
    recentTrips: savedPosts.slice(0, 4)
  };
}

export async function getVisiblePostById(viewerId: string, postId: string) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      userId: { in: visibleUserIds }
    },
    include: postSummaryInclude
  });

  if (!post) {
    return null;
  }

  const [postWithSavedState] = await attachSavedState(viewerId, [post]);
  return postWithSavedState;
}

export async function getProfileData(profileUsername: string, viewerId: string) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  const user = await prisma.user.findUnique({
    where: { username: profileUsername },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  if (!user) {
    return null;
  }

  if (!visibleUserIds.includes(user.id) && user.id !== viewerId) {
    return null;
  }

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    include: postSummaryInclude,
    orderBy: { visitedAt: "desc" }
  });
  const postsWithSavedState = await attachSavedState(viewerId, posts);

  const places = Array.from(new Set(postsWithSavedState.map((post) => `${post.city}, ${post.country}`)));
  const viewerPosts =
    viewerId === user.id
      ? postsWithSavedState
      : await prisma.post.findMany({
          where: { userId: viewerId },
          orderBy: { visitedAt: "desc" },
          select: {
            id: true,
            caption: true,
            placeName: true,
            city: true,
            country: true,
            visitedAt: true,
            mediaType: true,
            mediaUrl: true,
            thumbnailUrl: true
          }
        });
  const travelSummary = buildProfileTravelSummary(postsWithSavedState, viewerPosts);

  return { user, posts: postsWithSavedState, places, travelSummary };
}

export async function getOwnedCollections(userId: string, limit = 24) {
  const collections = await prisma.postCollection.findMany({
    where: { userId },
    include: collectionSummaryInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });

  return collections.map(normalizeCollectionSummary);
}

export async function getOwnedCollectionById(userId: string, collectionId: string) {
  const collection = await prisma.postCollection.findFirst({
    where: {
      id: collectionId,
      userId
    },
    include: collectionSummaryInclude
  });

  if (!collection) {
    return null;
  }

  const posts = await prisma.post.findMany({
    where: {
      userId,
      collectionEntries: {
        some: {
          collectionId
        }
      }
    },
    include: postSummaryInclude,
    orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }]
  });

  return {
    collection: normalizeCollectionSummary(collection),
    posts: await attachSavedState(userId, posts)
  };
}

export async function getOwnedCollectionsForPost(userId: string, postId: string): Promise<CollectionChip[]> {
  const collections = await prisma.postCollection.findMany({
    where: {
      userId,
      posts: {
        some: {
          postId
        }
      }
    },
    select: {
      id: true,
      name: true
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  return collections;
}

export async function getWantToGoPlaceByLocation(userId: string, location: WantToGoLocation) {
  const placeKey = buildWantToGoPlaceKey(location);

  if (!placeKey.trim()) {
    return null;
  }

  return prisma.wantToGoPlace.findUnique({
    where: {
      userId_placeKey: {
        userId,
        placeKey
      }
    },
    select: {
      id: true,
      placeName: true
    }
  });
}

export async function getWantToGoPlaces(userId: string, limit = 64): Promise<WantToGoPlaceSummary[]> {
  const items = await prisma.wantToGoPlace.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { placeName: "asc" }],
    take: limit,
    select: {
      id: true,
      placeName: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      createdAt: true
    }
  });

  return items;
}

export async function getNotifications(userId: string, limit = 50): Promise<NotificationSummary[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: notificationInclude,
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return notifications.map((notification: IncludedNotification) => ({
    id: notification.id,
    type: notification.type,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
    actor: notification.actor,
    post: notification.post,
    comment: notification.comment,
    friendRequest: notification.friendRequest
  }));
}

export async function getRecentFeedPosts(viewerId: string, limit = 24) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  const posts = await prisma.post.findMany({
    where: {
      userId: { in: visibleUserIds }
    },
    include: postSummaryInclude,
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return attachSavedState(viewerId, posts);
}

export async function getSavedPosts(viewerId: string, limit = 48) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  try {
    const savedPosts = await prisma.savedPost.findMany({
      where: {
        userId: viewerId,
        post: {
          userId: { in: visibleUserIds }
        }
      },
      include: {
        post: {
          include: postSummaryInclude
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return savedPosts.map((savedPost) => ({
      ...savedPost.post,
      visitedWith: savedPost.post.visitedWith.map((tag) => tag.user),
      savedByViewer: true
    }));
  } catch {
    return [];
  }
}
