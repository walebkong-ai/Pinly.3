import { filterPostsByCategories } from "@/lib/map-filters";
import { resolveLayerUserIds } from "@/lib/map-groups";
import { FULL_WORLD_BOUNDS, getBoundsCenter, getLongitudeFilter, normalizeMapBounds } from "@/lib/map-viewport";
import { Prisma } from "@prisma/client";
import { getMapStage, getTimeFilterStart, buildLayerUserIds, buildMapPayload } from "@/lib/map-data";
import { prisma } from "@/lib/prisma";
import { buildVisibleUserIds } from "@/lib/permissions";
import type { LayerMode, MapCategory, TimeFilter } from "@/types/app";

export const postSummaryInclude = Prisma.validator<Prisma.PostInclude>()({
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true
    }
  }
});

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

  const filteredPosts = filterPostsByCategories(posts, categories);

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

  const uniqueUsers = new Set(posts.map((post) => post.userId));
  const center = posts.reduce(
    (acc, post, index) => ({
      latitude: acc.latitude + (post.latitude - acc.latitude) / (index + 1),
      longitude: acc.longitude + (post.longitude - acc.longitude) / (index + 1)
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    posts,
    friendCount: new Set(posts.filter((post) => post.userId !== viewerId).map((post) => post.userId)).size,
    center,
    visitors: Array.from(
      new Map(posts.map((post) => [post.user.id, post.user])).values()
    ),
    recentTrips: posts.slice(0, 4)
  };
}

export async function getVisiblePostById(viewerId: string, postId: string) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  return prisma.post.findFirst({
    where: {
      id: postId,
      userId: { in: visibleUserIds }
    },
    include: postSummaryInclude
  });
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

  const places = Array.from(new Set(posts.map((post) => `${post.city}, ${post.country}`)));

  return { user, posts, places };
}

export async function getRecentFeedPosts(viewerId: string, limit = 24) {
  const visibleUserIds = await getVisibleUserIds(viewerId);

  return prisma.post.findMany({
    where: {
      userId: { in: visibleUserIds }
    },
    include: postSummaryInclude,
    orderBy: { createdAt: "desc" },
    take: limit
  });
}
