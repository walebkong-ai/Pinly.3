import { hash } from "bcryptjs";
import { MediaType } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { DEMO_PASSWORD, DEMO_USERS, type DemoUserKey, getDemoAvatarUrl } from "@/lib/demo-config";
import { normalizeFriendPair } from "@/lib/friendships";
import { createLegalAcceptanceRecord } from "@/lib/legal";
import { createUniqueUsername } from "@/lib/usernames";

const DEMO_FRIENDSHIPS = [
  ["avery", "maya"],
  ["avery", "noah"],
  ["avery", "elena"],
  ["maya", "leo"],
  ["noah", "elena"]
] as const satisfies ReadonlyArray<readonly [DemoUserKey, DemoUserKey]>;

const DEMO_PENDING_REQUESTS = [
  ["leo", "avery"],
  ["elena", "maya"]
] as const satisfies ReadonlyArray<readonly [DemoUserKey, DemoUserKey]>;

const DEMO_POSTS = [
  ["avery", "Cafe Kitsune", "Paris", "France", 48.8656, 2.3212, "Morning espresso before a long walk through the Tuileries.", "IMAGE"],
  ["avery", "Canal Saint-Martin", "Paris", "France", 48.8722, 2.3644, "Golden hour by the canal felt like a film set.", "IMAGE"],
  ["avery", "Shibuya Crossing", "Tokyo", "Japan", 35.6595, 139.7005, "Every direction somehow works at once here.", "VIDEO"],
  ["avery", "Arashiyama Bamboo Grove", "Kyoto", "Japan", 35.017, 135.6774, "Quiet, cool air and the sound of leaves moving overhead.", "IMAGE"],
  ["maya", "DUMBO Waterfront", "New York", "USA", 40.7033, -73.9881, "Skyline views and a windy ferry ride back.", "IMAGE"],
  ["maya", "Washington Square Park", "New York", "USA", 40.7308, -73.9973, "Street musicians made the whole square feel alive.", "VIDEO"],
  ["maya", "Mission Dolores Park", "San Francisco", "USA", 37.7596, -122.4269, "Blanket, coffee, and a perfectly clear afternoon.", "IMAGE"],
  ["maya", "Palace of Fine Arts", "San Francisco", "USA", 37.8021, -122.4488, "A slow loop around the lagoon before sunset.", "IMAGE"],
  ["noah", "Plaza de Espana", "Seville", "Spain", 37.3772, -5.9869, "Tiles, light, and so much space to wander.", "IMAGE"],
  ["noah", "Alcazar Gardens", "Seville", "Spain", 37.3831, -5.9902, "The courtyard shadows were unreal in person.", "IMAGE"],
  ["noah", "Trastevere", "Rome", "Italy", 41.8897, 12.4691, "Dinner spilled into the street and nobody wanted to leave.", "VIDEO"],
  ["noah", "Trevi Fountain", "Rome", "Italy", 41.9009, 12.4833, "Yes it is crowded. Yes it is still worth it.", "IMAGE"],
  ["elena", "Christchurch Meadow", "Oxford", "UK", 51.7446, -1.2496, "Fog lifting off the grass made the whole morning glow.", "IMAGE"],
  ["elena", "Portobello Road", "London", "UK", 51.5175, -0.2057, "Found three tiny antiques shops and a great record stall.", "IMAGE"],
  ["elena", "Regent's Canal", "London", "UK", 51.5362, -0.091, "Walking path, boats, coffee, repeat.", "VIDEO"],
  ["leo", "Bondi Icebergs", "Sydney", "Australia", -33.8918, 151.2767, "Ocean pool mornings should be illegal back home.", "IMAGE"],
  ["leo", "Circular Quay", "Sydney", "Australia", -33.8607, 151.212, "Harbour light changed every ten minutes.", "IMAGE"],
  ["leo", "Fitzroy", "Melbourne", "Australia", -37.7986, 144.9787, "Best flat white of the trip, no contest.", "IMAGE"],
  ["maya", "Centro Historico", "Mexico City", "Mexico", 19.4326, -99.1332, "A full afternoon of murals, markets, and coffee.", "IMAGE"],
  ["avery", "Old Port", "Montreal", "Canada", 45.5075, -73.554, "Cold air, warm bagels, and the river iced over.", "IMAGE"]
] as const satisfies ReadonlyArray<
  readonly [DemoUserKey, string, string, string, number, number, string, "IMAGE" | "VIDEO"]
>;

type DemoUserRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
};

export type DemoProvisionPrisma = {
  user: {
    findUnique: (...args: any[]) => Promise<DemoUserRecord | null>;
    create: (...args: any[]) => Promise<DemoUserRecord>;
    update: (...args: any[]) => Promise<DemoUserRecord>;
  };
  friendship: {
    upsert: (...args: any[]) => Promise<unknown>;
  };
  friendRequest: {
    upsert: (...args: any[]) => Promise<unknown>;
  };
  post: {
    findFirst: (...args: any[]) => Promise<{ id: string } | null>;
    create: (...args: any[]) => Promise<unknown>;
  };
};

type DemoResetPrisma = DemoProvisionPrisma & {
  rateLimitEvent: {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
  passwordResetToken: {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
  group: {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
  friendRequest: DemoProvisionPrisma["friendRequest"] & {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
  friendship: DemoProvisionPrisma["friendship"] & {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
  post: DemoProvisionPrisma["post"] & {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
  user: DemoProvisionPrisma["user"] & {
    deleteMany: (...args: any[]) => Promise<unknown>;
  };
};

function resolveDemoPostMedia(index: number, mediaType: "IMAGE" | "VIDEO") {
  if (process.env.PINLY_E2E_MODE === "1") {
    return {
      mediaType: MediaType.IMAGE,
      mediaUrl: "/logo.png",
      thumbnailUrl: null
    };
  }

  const seedIndex = index + 1;

  return {
    mediaType: mediaType === "VIDEO" ? MediaType.VIDEO : MediaType.IMAGE,
    mediaUrl:
      mediaType === "IMAGE"
        ? `https://picsum.photos/seed/pinly-${seedIndex}/1200/900`
        : "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnailUrl: mediaType === "VIDEO" ? `https://picsum.photos/seed/pinly-video-${seedIndex}/1200/900` : null
  };
}

export async function ensureDemoDataset(prisma: DemoProvisionPrisma) {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const legalAcceptance = createLegalAcceptanceRecord(new Date("2026-03-21T00:00:00.000Z"));
  const usersByKey = new Map<DemoUserKey, DemoUserRecord>();

  for (const demoUser of DEMO_USERS) {
    const existingUser = await prisma.user.findUnique({
      where: { email: demoUser.email }
    });

    if (existingUser) {
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: demoUser.name,
          passwordHash,
          avatarUrl: getDemoAvatarUrl(demoUser.preferredUsername),
          ...legalAcceptance
        }
      });

      usersByKey.set(demoUser.key, updatedUser);
      continue;
    }

    const username = await createUniqueUsername(prisma, demoUser.preferredUsername);
    const createdUser = await prisma.user.create({
      data: {
        name: demoUser.name,
        username,
        email: demoUser.email,
        passwordHash,
        avatarUrl: getDemoAvatarUrl(demoUser.preferredUsername),
        ...legalAcceptance
      }
    });

    usersByKey.set(demoUser.key, createdUser);
  }

  for (const [leftKey, rightKey] of DEMO_FRIENDSHIPS) {
    const leftUser = usersByKey.get(leftKey);
    const rightUser = usersByKey.get(rightKey);

    if (!leftUser || !rightUser) {
      continue;
    }

    const { userAId, userBId } = normalizeFriendPair(leftUser.id, rightUser.id);
    await prisma.friendship.upsert({
      where: {
        userAId_userBId: {
          userAId,
          userBId
        }
      },
      update: {},
      create: {
        userAId,
        userBId
      }
    });
  }

  for (const [fromKey, toKey] of DEMO_PENDING_REQUESTS) {
    const fromUser = usersByKey.get(fromKey);
    const toUser = usersByKey.get(toKey);

    if (!fromUser || !toUser) {
      continue;
    }

    await prisma.friendRequest.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: fromUser.id,
          toUserId: toUser.id
        }
      },
      update: {
        status: "PENDING"
      },
      create: {
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        status: "PENDING"
      }
    });
  }

  for (const [index, post] of DEMO_POSTS.entries()) {
    const [userKey, placeName, city, country, latitude, longitude, caption, mediaType] = post;
    const user = usersByKey.get(userKey);

    if (!user) {
      continue;
    }

    const existingPost = await prisma.post.findFirst({
      where: {
        userId: user.id,
        placeName,
        city,
        country,
        caption
      },
      select: {
        id: true
      }
    });

    if (existingPost) {
      continue;
    }

    const seedIndex = index + 1;
    const resolvedMedia = resolveDemoPostMedia(index, mediaType);
    await prisma.post.create({
      data: {
        userId: user.id,
        mediaType: resolvedMedia.mediaType,
        mediaUrl: resolvedMedia.mediaUrl,
        thumbnailUrl: resolvedMedia.thumbnailUrl,
        caption,
        placeName,
        city,
        country,
        latitude,
        longitude,
        visitedAt: subDays(new Date(), seedIndex * 3),
        createdAt: addDays(subDays(new Date(), seedIndex * 3), 1)
      }
    });
  }
}

export async function resetDemoDataset(prisma: DemoResetPrisma) {
  await prisma.rateLimitEvent.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.group.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await ensureDemoDataset(prisma);
}
