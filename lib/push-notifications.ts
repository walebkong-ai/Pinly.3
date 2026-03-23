export const PINLY_PUSH_CHANNEL_ID = "pinly-activity";
export const PINLY_PUSH_CHANNEL_NAME = "Activity";
export const PINLY_PUSH_PROMPT_STORAGE_KEY = "pinly.push.prompt-state.v1";
export const PINLY_PUSH_VALUE_CONTEXT_STORAGE_KEY = "pinly.push.value-context.v1";
export const PINLY_PUSH_OPEN_PROMPT_EVENT = "pinly:push-open-prompt";
export const PINLY_PUSH_UNREGISTER_EVENT = "pinly:push-unregister";

export type PinlyNotificationType =
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "COMMENT_REPLIED"
  | "POST_SHARED"
  | "FRIEND_REQUEST_RECEIVED"
  | "FRIEND_REQUEST_ACCEPTED";

export type PinlyNotificationRouteInput = {
  type?: string | null;
  postId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  actorUsername?: string | null;
  explicitPath?: string | null;
};

export type PinlyNotificationCopyInput = {
  type: PinlyNotificationType;
  actorName?: string | null;
  placeName?: string | null;
  commentContent?: string | null;
};

function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildPostMapDeepLink({
  postId,
  latitude,
  longitude
}: {
  postId: string;
  latitude: number;
  longitude: number;
}) {
  const params = new URLSearchParams({
    postId,
    lat: String(latitude),
    lng: String(longitude)
  });

  return `/map?${params.toString()}`;
}

export function buildNotificationDeepLink({
  type,
  postId,
  latitude,
  longitude,
  actorUsername,
  explicitPath
}: PinlyNotificationRouteInput) {
  if (explicitPath) {
    return explicitPath;
  }

  if (postId) {
    return `/posts/${postId}`;
  }

  if (type === "FRIEND_REQUEST_RECEIVED" || type === "FRIEND_REQUEST_ACCEPTED") {
    return "/friends";
  }

  if (actorUsername) {
    return `/profile/${actorUsername}`;
  }

  return "/notifications";
}

export function buildNotificationMapLink({
  postId,
  latitude,
  longitude
}: Pick<PinlyNotificationRouteInput, "postId" | "latitude" | "longitude">) {
  if (!postId || !isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return null;
  }

  return buildPostMapDeepLink({
    postId,
    latitude,
    longitude
  });
}

export function getPushNotificationTitle({ type, actorName }: PinlyNotificationCopyInput) {
  const safeActorName = actorName?.trim() || "Someone";

  switch (type) {
    case "POST_LIKED":
      return `${safeActorName} liked your memory`;
    case "POST_COMMENTED":
      return `${safeActorName} commented on your memory`;
    case "COMMENT_REPLIED":
      return `${safeActorName} replied to your comment`;
    case "POST_SHARED":
      return `${safeActorName} shared your memory`;
    case "FRIEND_REQUEST_RECEIVED":
      return `${safeActorName} sent a friend request`;
    case "FRIEND_REQUEST_ACCEPTED":
      return `${safeActorName} accepted your request`;
    default:
      return "New activity on Pinly";
  }
}

export function getPushNotificationBody({ type, placeName, commentContent }: PinlyNotificationCopyInput) {
  const trimmedComment = commentContent?.trim();
  const trimmedPlaceName = placeName?.trim();

  switch (type) {
    case "POST_COMMENTED":
    case "COMMENT_REPLIED":
      return trimmedComment || trimmedPlaceName || "Open Pinly to see the conversation.";
    case "POST_LIKED":
    case "POST_SHARED":
      return trimmedPlaceName || "Open Pinly to revisit the memory.";
    case "FRIEND_REQUEST_RECEIVED":
      return "Open Friends to respond.";
    case "FRIEND_REQUEST_ACCEPTED":
      return "You can now see each other's memories.";
    default:
      return "Open Pinly to see what's new.";
  }
}

export function resolvePushNavigationPath(data: Record<string, string | undefined>) {
  const path = data.path?.trim();

  if (path) {
    return path;
  }

  const mapPath = data.mapPath?.trim();

  if (mapPath) {
    return mapPath;
  }

  const postId = data.postId?.trim();
  const latitude = data.latitude ? Number.parseFloat(data.latitude) : null;
  const longitude = data.longitude ? Number.parseFloat(data.longitude) : null;
  const actorUsername = data.actorUsername?.trim();

  return buildNotificationDeepLink({
    type: data.type,
    postId,
    latitude,
    longitude,
    actorUsername
  });
}

export function shouldTrackValueContext(pathname: string) {
  return (
    pathname === "/map" ||
    pathname === "/feed" ||
    pathname === "/create" ||
    pathname === "/friends" ||
    pathname.startsWith("/profile/")
  );
}
