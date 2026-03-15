import { filterPostsByCategories } from "@/lib/map-filters";
import { resolveLayerUserIds } from "@/lib/map-groups";
import { FULL_WORLD_BOUNDS, getBoundsCenter, getLongitudeFilter, normalizeMapBounds } from "@/lib/map-viewport";
import { Prisma } from "@prisma/client";
import { getMapStage, getTimeFilterStart, buildLayerUserIds, buildMapPayload } from "@/lib/map-data";
import { prisma } from "@/lib/prisma";
import { buildVisibleUserIds } from "@/lib/permissions";
import { buildProfileTravelSummary } from "@/lib/profile-summary";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import { getSearchTerms, rankBySearch } from "@/lib/search";
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

type ViewerPostState = {
  savedPostIds: Set<string>;
  likedPostIds: Set<string>;
  likeCountByPostId: Map<string, number>;
};

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

async function getViewerPostState(viewerId: string, postIds: string[]): Promise<ViewerPostState> {
  if (postIds.length === 0) {
    return {
      savedPostIds: new Set<string>(),
      likedPostIds: new Set<string>(),
      likeCountByPostId: new Map<string, number>()
    };
  }

  const savedPostIds = await getSavedPostIdSet(viewerId, postIds);

  try {
    const [likedPosts, likeCounts] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId: viewerId,
          postId: { in: postIds }
        },
        select: {
          postId: true
        }
      }),
      prisma.like.groupBy({
        by: ["postId"],
        where: {
          postId: { in: postIds }
        },
        _count: {
          _all: true
        }
      })
    ]);

    return {
      savedPostIds,
      likedPostIds: new Set(likedPosts.map((like) => like.postId)),
      likeCountByPostId: new Map(
        likeCounts.map((entry) => [entry.postId, entry._count._all])
      )
    };
  } catch {
    return {
      savedPostIds,
      likedPostIds: new Set<string>(),
      likeCountByPostId: new Map<string, number>()
    };
  }
}

function normalizeIncludedPost(
  post: IncludedPost,
  viewerState?: ViewerPostState
) {
  return {
    ...post,
    visitedWith: post.visitedWith.map((tag) => tag.user),
    savedByViewer: viewerState ? viewerState.savedPostIds.has(post.id) : undefined,
    likedByViewer: viewerState ? viewerState.likedPostIds.has(post.id) : undefined,
    likeCount: viewerState ? viewerState.likeCountByPostId.get(post.id) ?? 0 : undefined
  };
}

async function attachViewerPostState(viewerId: string, posts: IncludedPost[]) {
  const viewerState = await getViewerPostState(
    viewerId,
    posts.map((post) => post.id)
  );

  return posts.map((post) => normalizeIncludedPost(post, viewerState));
}

function normalizePostSummaries(posts: IncludedPost[]) {
  return posts.map((post) => normalizeIncludedPost(post));
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
  const searchTerms = query ? getSearchTerms(query) : [];
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

  if (searchTerms.length > 0) {
    whereClauses.push({
      AND: searchTerms.map((term) => ({
        OR: [
          { placeName: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
          { country: { contains: term, mode: "insensitive" } },
          { caption: { contains: term, mode: "insensitive" } },
          { user: { name: { contains: term, mode: "insensitive" } } },
          { user: { username: { contains: term, mode: "insensitive" } } }
        ]
      }))
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

  const rankedPosts =
    searchTerms.length > 0
      ? rankBySearch(
          normalizePostSummaries(posts),
          query ?? "",
          (post) => [
            { value: post.placeName, weight: 4.5 },
            { value: post.city, weight: 4 },
            { value: post.country, weight: 3.4 },
            { value: post.user.username, weight: 3.1 },
            { value: post.user.name, weight: 2.8 },
            { value: post.caption, weight: 1.8 }
          ],
          (post) => new Date(post.visitedAt).getTime()
        )
      : normalizePostSummaries(posts);

  const filteredPosts = filterPostsByCategories(rankedPosts, categories);

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
  const cityTerms = getSearchTerms(city);
  const countryTerms = country ? getSearchTerms(country) : [];
  const searchClauses: Prisma.PostWhereInput[] = [
    {
      userId: { in: visibleUserIds }
    }
  ];

  if (cityTerms.length > 0) {
    searchClauses.push(
      ...cityTerms.map((term): Prisma.PostWhereInput => ({
        OR: [
          { city: { contains: term, mode: "insensitive" } },
          { country: { contains: term, mode: "insensitive" } }
        ]
      }))
    );
  }

  if (countryTerms.length > 0) {
    searchClauses.push(
      ...countryTerms.map((term): Prisma.PostWhereInput => ({
        country: { contains: term, mode: "insensitive" }
      }))
    );
  }

  const posts = await prisma.post.findMany({
    where: {
      AND: searchClauses
    },
    include: postSummaryInclude,
    orderBy: { visitedAt: "desc" },
    take: 200
  });

  const savedPosts = await attachViewerPostState(viewerId, posts);
  const groupedByCity = new Map<string, typeof savedPosts>();

  for (const post of savedPosts) {
    const key = `${post.city.toLowerCase()}::${post.country.toLowerCase()}`;
    const existing = groupedByCity.get(key);

    if (existing) {
      existing.push(post);
    } else {
      groupedByCity.set(key, [post]);
    }
  }

  const rankedGroups = rankBySearch(
    Array.from(groupedByCity.values()),
    [city, country].filter(Boolean).join(" "),
    (groupPosts) => [
      { value: groupPosts[0]?.city, weight: 4.2 },
      { value: groupPosts[0]?.country, weight: 3.4 }
    ],
    (groupPosts) => new Date(groupPosts[0]?.visitedAt ?? 0).getTime()
  );
  const activePosts = rankedGroups[0] ?? [];
  const pagedPosts = activePosts.slice((page - 1) * pageSize, page * pageSize);

  const center = pagedPosts.reduce(
    (acc, post, index) => ({
      latitude: acc.latitude + (post.latitude - acc.latitude) / (index + 1),
      longitude: acc.longitude + (post.longitude - acc.longitude) / (index + 1)
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    city: activePosts[0]?.city ?? city,
    country: activePosts[0]?.country ?? country ?? "",
    postCount: activePosts.length,
    posts: pagedPosts,
    friendCount: new Set(activePosts.filter((post) => post.userId !== viewerId).map((post) => post.userId)).size,
    center,
    visitors: Array.from(
      new Map(activePosts.map((post) => [post.user.id, post.user])).values()
    ),
    recentTrips: activePosts.slice(0, 4)
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

  const [postWithSavedState] = await attachViewerPostState(viewerId, [post]);
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
  const postsWithSavedState = await attachViewerPostState(viewerId, posts);

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
  try {
    const collections = await prisma.postCollection.findMany({
      where: { userId },
      include: collectionSummaryInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    return collections.map(normalizeCollectionSummary);
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getOwnedCollectionById(userId: string, collectionId: string) {
  try {
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
      posts: await attachViewerPostState(userId, posts)
    };
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getOwnedCollectionsForPost(userId: string, postId: string): Promise<CollectionChip[]> {
  try {
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
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getWantToGoPlaceByLocation(userId: string, location: WantToGoLocation) {
  const placeKey = buildWantToGoPlaceKey(location);

  if (!placeKey.trim()) {
    return null;
  }

  try {
    return await prisma.wantToGoPlace.findUnique({
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
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getWantToGoPlaces(userId: string, limit = 64): Promise<WantToGoPlaceSummary[]> {
  try {
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
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getNotifications(userId: string, limit = 50): Promise<NotificationSummary[]> {
  try {
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
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return [];
    }

    throw error;
  }
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

  return attachViewerPostState(viewerId, posts);
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

    const viewerState = await getViewerPostState(
      viewerId,
      savedPosts.map((savedPost) => savedPost.post.id)
    );

    return savedPosts.map((savedPost) => ({
      ...normalizeIncludedPost(savedPost.post, viewerState),
      savedByViewer: true
    }));
  } catch {
    return [];
  }
}
