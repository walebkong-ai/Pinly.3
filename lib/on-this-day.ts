import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CollectionChip } from "@/types/app";

export const ON_THIS_DAY_WINDOW_DAYS = 3;
export const ON_THIS_DAY_MAX_GROUPS = 3;
export const ON_THIS_DAY_MAX_PREVIEW_POSTS = 3;
const REFERENCE_YEAR = 2000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_IN_REFERENCE_YEAR = 366;

const onThisDayPostSelect = Prisma.validator<Prisma.PostSelect>()({
  id: true,
  mediaType: true,
  mediaUrl: true,
  thumbnailUrl: true,
  caption: true,
  placeName: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  visitedAt: true,
  createdAt: true,
  collectionEntries: {
    orderBy: { createdAt: "asc" },
    select: {
      collection: {
        select: {
          id: true,
          name: true,
          color: true
        }
      }
    }
  }
});

type OnThisDayDbPost = Prisma.PostGetPayload<{
  select: typeof onThisDayPostSelect;
}>;

export type OnThisDayMemoryPost = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  caption: string;
  placeName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  visitedAt: string | Date;
  createdAt: string | Date;
  collection: CollectionChip | null;
};

export type OnThisDayMemoryGroup = {
  id: string;
  score: number;
  yearsAgo: number;
  dayDistance: number;
  visitedAt: string | Date;
  placeName: string;
  city: string;
  country: string;
  collection: CollectionChip | null;
  memoryCount: number;
  leadPost: OnThisDayMemoryPost;
  posts: OnThisDayMemoryPost[];
};

type RankedCandidate = {
  post: OnThisDayMemoryPost;
  score: number;
  yearsAgo: number;
  dayDistance: number;
};

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function getReferenceDayOfYear(value: string | Date) {
  const date = toDate(value);
  const referenceDate = Date.UTC(REFERENCE_YEAR, date.getUTCMonth(), date.getUTCDate());
  const referenceStart = Date.UTC(REFERENCE_YEAR, 0, 1);
  return Math.floor((referenceDate - referenceStart) / MS_PER_DAY);
}

function getDayDistanceFromToday(visitedAt: string | Date, now: Date) {
  const visitedDay = getReferenceDayOfYear(visitedAt);
  const currentDay = getReferenceDayOfYear(now);
  const absoluteDifference = Math.abs(visitedDay - currentDay);
  return Math.min(absoluteDifference, DAYS_IN_REFERENCE_YEAR - absoluteDifference);
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function toCollectionChip(post: OnThisDayDbPost): CollectionChip | null {
  const collection = post.collectionEntries[0]?.collection;

  if (!collection) {
    return null;
  }

  return {
    id: collection.id,
    name: collection.name,
    color: collection.color
  };
}

function normalizePost(post: OnThisDayDbPost): OnThisDayMemoryPost {
  return {
    id: post.id,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl,
    caption: post.caption,
    placeName: post.placeName,
    city: post.city,
    country: post.country,
    latitude: post.latitude,
    longitude: post.longitude,
    visitedAt: post.visitedAt,
    createdAt: post.createdAt,
    collection: toCollectionChip(post)
  };
}

function buildGroupKey(post: OnThisDayMemoryPost) {
  const visitedDay = toDate(post.visitedAt).toISOString().slice(0, 10);

  if (post.collection) {
    return `collection:${post.collection.id}:${visitedDay}`;
  }

  return `place:${normalizeValue(post.placeName)}|${normalizeValue(post.city)}|${normalizeValue(post.country)}|${visitedDay}`;
}

function scoreCandidate(post: OnThisDayMemoryPost, now: Date): RankedCandidate | null {
  const visitedAt = toDate(post.visitedAt);
  const currentYear = now.getUTCFullYear();
  const visitedYear = visitedAt.getUTCFullYear();

  if (visitedYear >= currentYear) {
    return null;
  }

  const dayDistance = getDayDistanceFromToday(visitedAt, now);

  if (dayDistance > ON_THIS_DAY_WINDOW_DAYS) {
    return null;
  }

  const yearsAgo = currentYear - visitedYear;
  const captionLength = post.caption.trim().length;
  const hasCollection = Boolean(post.collection);
  const hasPlace = Boolean(post.placeName.trim());
  const hasCity = Boolean(post.city.trim() || post.country.trim());
  const hasThumbnail = Boolean(post.thumbnailUrl);

  let score = 240 - dayDistance * 60;
  score += Math.min(yearsAgo, 12) * 6;
  score += hasCollection ? 30 : 0;
  score += hasPlace ? 18 : 0;
  score += hasCity ? 12 : 0;
  score += hasThumbnail ? 12 : 0;
  score += post.mediaType === "VIDEO" ? 4 : 8;

  if (captionLength >= 56) {
    score += 28;
  } else if (captionLength >= 24) {
    score += 20;
  } else if (captionLength > 0) {
    score += 8;
  }

  return {
    post,
    score,
    yearsAgo,
    dayDistance
  };
}

export function buildOnThisDayGroups(posts: OnThisDayMemoryPost[], now = new Date()) {
  const rankedCandidates = posts
    .map((post) => scoreCandidate(post, now))
    .filter((candidate): candidate is RankedCandidate => candidate !== null);

  const groupedCandidates = new Map<string, RankedCandidate[]>();

  for (const candidate of rankedCandidates) {
    const key = buildGroupKey(candidate.post);
    const existingGroup = groupedCandidates.get(key);

    if (existingGroup) {
      existingGroup.push(candidate);
    } else {
      groupedCandidates.set(key, [candidate]);
    }
  }

  return Array.from(groupedCandidates.entries())
    .map(([key, candidates]) => {
      const sortedCandidates = [...candidates].sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return toDate(right.post.visitedAt).getTime() - toDate(left.post.visitedAt).getTime();
      });
      const leadCandidate = sortedCandidates[0];
      const leadPost = leadCandidate.post;
      const memoryCount = sortedCandidates.length;
      const groupScore =
        leadCandidate.score +
        Math.min(memoryCount - 1, 2) * 22 +
        (leadPost.collection ? 18 : 0) +
        (memoryCount >= 3 ? 8 : 0);

      return {
        id: key,
        score: groupScore,
        yearsAgo: leadCandidate.yearsAgo,
        dayDistance: leadCandidate.dayDistance,
        visitedAt: leadPost.visitedAt,
        placeName: leadPost.placeName,
        city: leadPost.city,
        country: leadPost.country,
        collection: leadPost.collection,
        memoryCount,
        leadPost,
        posts: sortedCandidates.slice(0, ON_THIS_DAY_MAX_PREVIEW_POSTS).map((candidate) => candidate.post)
      } satisfies OnThisDayMemoryGroup;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.dayDistance !== right.dayDistance) {
        return left.dayDistance - right.dayDistance;
      }

      return toDate(right.visitedAt).getTime() - toDate(left.visitedAt).getTime();
    })
    .slice(0, ON_THIS_DAY_MAX_GROUPS);
}

export async function getOnThisDayMemoryGroups(userId: string, now = new Date()) {
  const startOfCurrentYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const posts = await prisma.post.findMany({
    where: {
      userId,
      isArchived: false,
      visitedAt: {
        lt: startOfCurrentYear
      }
    },
    select: onThisDayPostSelect,
    orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
    take: 240
  });

  return buildOnThisDayGroups(posts.map(normalizePost), now);
}

