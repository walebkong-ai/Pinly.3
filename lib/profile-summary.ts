import type { ProfileTravelSummary } from "@/types/app";

type TravelSummaryPost = {
  id: string;
  caption: string;
  placeName: string;
  city: string;
  country: string;
  visitedAt: string | Date;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
};

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function buildCityKey(post: Pick<TravelSummaryPost, "city" | "country">) {
  return `${normalizeValue(post.city)}|${normalizeValue(post.country)}`;
}

function buildPlaceKey(post: Pick<TravelSummaryPost, "placeName" | "city" | "country">) {
  return `${normalizeValue(post.placeName)}|${buildCityKey(post)}`;
}

export function buildProfileTravelSummary(
  profilePosts: TravelSummaryPost[],
  viewerPosts: Pick<TravelSummaryPost, "city" | "country">[] = []
): ProfileTravelSummary {
  const sortedPosts = [...profilePosts].sort(
    (left, right) => new Date(right.visitedAt).getTime() - new Date(left.visitedAt).getTime()
  );

  const cityKeys = new Set<string>();
  const countryKeys = new Set<string>();
  const recentPlaces = new Map<
    string,
    {
      placeName: string;
      city: string;
      country: string;
      visitedAt: string | Date;
    }
  >();

  for (const post of sortedPosts) {
    cityKeys.add(buildCityKey(post));
    countryKeys.add(normalizeValue(post.country));

    const placeKey = buildPlaceKey(post);
    if (!recentPlaces.has(placeKey)) {
      recentPlaces.set(placeKey, {
        placeName: post.placeName,
        city: post.city,
        country: post.country,
        visitedAt: post.visitedAt
      });
    }
  }

  const viewerCityKeys = new Set(viewerPosts.map((post) => buildCityKey(post)));
  const sharedPlaces = new Map<string, { city: string; country: string }>();

  for (const post of sortedPosts) {
    const cityKey = buildCityKey(post);
    if (viewerCityKeys.has(cityKey) && !sharedPlaces.has(cityKey)) {
      sharedPlaces.set(cityKey, {
        city: post.city,
        country: post.country
      });
    }
  }

  return {
    cityCount: cityKeys.size,
    countryCount: countryKeys.size,
    recentPlaces: Array.from(recentPlaces.values()).slice(0, 4),
    recentMemories: sortedPosts.slice(0, 3).map((post) => ({
      id: post.id,
      caption: post.caption,
      placeName: post.placeName,
      city: post.city,
      country: post.country,
      visitedAt: post.visitedAt,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      thumbnailUrl: post.thumbnailUrl
    })),
    sharedPlaces: Array.from(sharedPlaces.values()).slice(0, 4)
  };
}
