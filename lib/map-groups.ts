import type { LayerMode, MapGroupOption, UserSummary } from "@/types/app";

export function buildLightweightMapGroups(friends: UserSummary[]): MapGroupOption[] {
  return friends.map((friend) => ({
    id: friend.id,
    label: friend.name,
    description: `@${friend.username}`,
    memberIds: [friend.id],
    kind: "friend"
  }));
}

export function resolveLayerUserIds({
  viewerId,
  friendIds,
  selectedGroupIds,
  layer
}: {
  viewerId: string;
  friendIds: string[];
  selectedGroupIds: string[];
  layer: LayerMode;
}) {
  const filteredFriendIds = selectedGroupIds.length
    ? friendIds.filter((friendId) => selectedGroupIds.includes(friendId))
    : friendIds;

  if (layer === "you") {
    return [viewerId];
  }

  if (layer === "friends") {
    return filteredFriendIds;
  }

  return Array.from(new Set([viewerId, ...filteredFriendIds]));
}
