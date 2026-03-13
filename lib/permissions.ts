import type { Friendship, Post } from "@prisma/client";

export function buildVisibleUserIds(viewerId: string, friendships: Friendship[]) {
  const ids = new Set<string>([viewerId]);

  for (const friendship of friendships) {
    if (friendship.userAId === viewerId) {
      ids.add(friendship.userBId);
    }

    if (friendship.userBId === viewerId) {
      ids.add(friendship.userAId);
    }
  }

  return [...ids];
}

export function canViewerAccessPost(viewerId: string, post: Pick<Post, "userId">, visibleUserIds: string[]) {
  return viewerId === post.userId || visibleUserIds.includes(post.userId);
}

export function postIsWithinBounds(
  latitude: number,
  longitude: number,
  bounds: { north: number; south: number; east: number; west: number }
) {
  return latitude <= bounds.north &&
    latitude >= bounds.south &&
    longitude <= bounds.east &&
    longitude >= bounds.west;
}
