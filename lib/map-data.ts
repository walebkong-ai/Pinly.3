import { subDays, subMonths, subYears } from "date-fns";
import type {
  CityContext,
  FriendActivityItem,
  LayerMode,
  MapMarker,
  MapResponse,
  MapStage,
  MarkerPreviewPost,
  PostSummary,
  TimeFilter,
  UserSummary
} from "@/types/app";

type CoordinateCenter = {
  latitude: number;
  longitude: number;
};

type CityGroup = {
  key: string;
  city: string;
  country: string;
  posts: PostSummary[];
  center: CoordinateCenter;
};

type PlaceGroup = {
  key: string;
  placeName: string;
  city: string;
  country: string;
  posts: PostSummary[];
  center: CoordinateCenter;
};

export function getMapStage(zoom: number): MapStage {
  if (zoom < 4) {
    return "world";
  }

  if (zoom < 7) {
    return "city";
  }

  if (zoom < 11) {
    return "pin";
  }

  return "bubble";
}

export function getTimeFilterStart(time: TimeFilter) {
  const now = new Date();

  if (time === "30d") {
    return subDays(now, 30);
  }

  if (time === "6m") {
    return subMonths(now, 6);
  }

  if (time === "1y") {
    return subYears(now, 1);
  }

  return null;
}

export function buildLayerUserIds(viewerId: string, friendIds: string[], layer: LayerMode) {
  if (layer === "you") {
    return [viewerId];
  }

  if (layer === "friends") {
    return friendIds;
  }

  return Array.from(new Set([viewerId, ...friendIds]));
}

function uniqueUsers(posts: PostSummary[]) {
  const seen = new Set<string>();
  const users: UserSummary[] = [];

  for (const post of posts) {
    if (seen.has(post.user.id)) {
      continue;
    }

    seen.add(post.user.id);
    users.push(post.user);
  }

  return users;
}

function averageCenter(posts: PostSummary[]): CoordinateCenter {
  return posts.reduce(
    (acc, post, index) => ({
      latitude: acc.latitude + (post.latitude - acc.latitude) / (index + 1),
      longitude: acc.longitude + (post.longitude - acc.longitude) / (index + 1)
    }),
    { latitude: 0, longitude: 0 }
  );
}

function cityKey(post: PostSummary) {
  return `${post.city.trim().toLowerCase()}::${post.country.trim().toLowerCase()}`;
}

function placeKey(post: PostSummary) {
  return `${post.placeName.trim().toLowerCase()}::${post.city.trim().toLowerCase()}::${post.latitude.toFixed(4)}::${post.longitude.toFixed(4)}`;
}

function sortPostsDescending(posts: PostSummary[]) {
  return [...posts].sort((left, right) => +new Date(right.visitedAt) - +new Date(left.visitedAt));
}

function toPreviewPost(post: PostSummary): MarkerPreviewPost {
  return {
    id: post.id,
    caption: post.caption,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl,
    placeName: post.placeName,
    city: post.city,
    country: post.country,
    visitedAt: post.visitedAt,
    user: post.user
  };
}

function groupCities(posts: PostSummary[]) {
  const groups = new Map<string, CityGroup>();

  for (const post of posts) {
    const key = cityKey(post);
    const existing = groups.get(key);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    groups.set(key, {
      key,
      city: post.city,
      country: post.country,
      posts: [post],
      center: { latitude: 0, longitude: 0 }
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    posts: sortPostsDescending(group.posts),
    center: averageCenter(group.posts)
  }));
}

function groupPlaces(posts: PostSummary[]) {
  const groups = new Map<string, PlaceGroup>();

  for (const post of posts) {
    const key = placeKey(post);
    const existing = groups.get(key);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    groups.set(key, {
      key,
      placeName: post.placeName,
      city: post.city,
      country: post.country,
      posts: [post],
      center: { latitude: 0, longitude: 0 }
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    posts: sortPostsDescending(group.posts),
    center: averageCenter(group.posts)
  }));
}

function createCityCluster(group: CityGroup, viewerId: string): MapMarker {
  return {
    type: "cityCluster",
    id: `city-${group.key}`,
    latitude: group.center.latitude,
    longitude: group.center.longitude,
    city: group.city,
    country: group.country,
    postCount: group.posts.length,
    friendCount: uniqueUsers(group.posts.filter((post) => post.userId !== viewerId)).length,
    visitors: uniqueUsers(group.posts).slice(0, 4),
    postIds: group.posts.map((p) => p.id)
  };
}

function createPlaceCluster(group: PlaceGroup): MapMarker {
  return {
    type: "placeCluster",
    id: `place-${group.key}`,
    latitude: group.center.latitude,
    longitude: group.center.longitude,
    placeName: group.placeName,
    city: group.city,
    country: group.country,
    postCount: group.posts.length,
    visitors: uniqueUsers(group.posts).slice(0, 4),
    previewPost: toPreviewPost(group.posts[0]),
    posts: group.posts,
    postIds: group.posts.map((p) => p.id)
  };
}

function createPin(post: PostSummary): MapMarker {
  return {
    type: "pin",
    id: `pin-${post.id}`,
    latitude: post.latitude,
    longitude: post.longitude,
    post
  };
}

function createProfileBubble(post: PostSummary): MapMarker {
  return {
    type: "profileBubble",
    id: `bubble-${post.id}`,
    latitude: post.latitude,
    longitude: post.longitude,
    post
  };
}

function distanceToCenter(center: CoordinateCenter, target: CoordinateCenter) {
  const latitudeDelta = center.latitude - target.latitude;
  const longitudeDelta = center.longitude - target.longitude;

  return Math.sqrt(latitudeDelta ** 2 + longitudeDelta ** 2);
}

function pickActiveCity(groups: CityGroup[], center: CoordinateCenter) {
  if (!groups.length) {
    return null;
  }

  return [...groups].sort(
    (left, right) => distanceToCenter(center, left.center) - distanceToCenter(center, right.center)
  )[0];
}

function buildCityContext(group: CityGroup, viewerId: string): CityContext {
  return {
    city: group.city,
    country: group.country,
    friendCount: uniqueUsers(group.posts.filter((post) => post.userId !== viewerId)).length,
    visitors: uniqueUsers(group.posts),
    recentTrips: group.posts.slice(0, 4),
    center: group.center
  };
}

function buildPlaceAndPinMarkers(posts: PostSummary[]) {
  return groupPlaces(posts).flatMap((group) => (group.posts.length > 1 ? [createPlaceCluster(group)] : [createPin(group.posts[0])]));
}

function buildBubbleMarkers(posts: PostSummary[]) {
  const placeGroups = groupPlaces(posts);

  return placeGroups.flatMap((group) =>
    group.posts.length > 1 ? [createPlaceCluster(group)] : [createProfileBubble(group.posts[0])]
  );
}

function buildFriendActivity(posts: PostSummary[], viewerId: string): FriendActivityItem[] {
  return sortPostsDescending(posts)
    .filter((post) => post.userId !== viewerId)
    .slice(0, 5)
    .map((post) => ({
      id: `activity-${post.id}`,
      postId: post.id,
      user: post.user,
      placeName: post.placeName,
      city: post.city,
      country: post.country,
      visitedAt: post.visitedAt
    }));
}

export function buildMapPayload({
  posts,
  zoom,
  center,
  viewerId
}: {
  posts: PostSummary[];
  zoom: number;
  center: CoordinateCenter;
  viewerId: string;
}): MapResponse {
  const stage = getMapStage(zoom);
  const sortedPosts = sortPostsDescending(posts);
  const cityGroups = groupCities(sortedPosts);
  const activeCity = stage === "city" ? pickActiveCity(cityGroups, center) : null;

  let markers: MapMarker[] = [];
  let cityContext: CityContext | null = null;

  if (stage === "world") {
    markers = cityGroups.map((group) => createCityCluster(group, viewerId));
  } else if (stage === "city") {
    markers = cityGroups
      .filter((group) => group.key !== activeCity?.key)
      .map((group) => createCityCluster(group, viewerId));

    if (activeCity) {
      markers = [...markers, ...buildPlaceAndPinMarkers(activeCity.posts)];
      cityContext = buildCityContext(activeCity, viewerId);
    }
  } else if (stage === "pin") {
    markers = buildPlaceAndPinMarkers(sortedPosts);
  } else {
    markers = buildBubbleMarkers(sortedPosts);
  }

  return {
    stage,
    markers,
    cityContext,
    friendActivity: buildFriendActivity(sortedPosts, viewerId)
  };
}
