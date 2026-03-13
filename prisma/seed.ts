import { hash } from "bcryptjs";
import { PrismaClient, MediaType } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { pathToFileURL } from "node:url";
import { normalizeFriendPair } from "../lib/friendships";

const prisma = new PrismaClient();
const SEED_CONFIRMATION_TOKEN = "pinly-demo";

const users = [
  { name: "Avery Chen", username: "avery", email: "avery@pinly.demo" },
  { name: "Maya Singh", username: "maya", email: "maya@pinly.demo" },
  { name: "Noah Brooks", username: "noah", email: "noah@pinly.demo" },
  { name: "Elena Garcia", username: "elena", email: "elena@pinly.demo" },
  { name: "Leo Martin", username: "leo", email: "leo@pinly.demo" }
];

const postSeed = [
  ["avery", "Cafe Kitsune", "Paris", "France", 48.8656, 2.3212, "Morning espresso before a long walk through the Tuileries.", MediaType.IMAGE],
  ["avery", "Canal Saint-Martin", "Paris", "France", 48.8722, 2.3644, "Golden hour by the canal felt like a film set.", MediaType.IMAGE],
  ["avery", "Shibuya Crossing", "Tokyo", "Japan", 35.6595, 139.7005, "Every direction somehow works at once here.", MediaType.VIDEO],
  ["avery", "Arashiyama Bamboo Grove", "Kyoto", "Japan", 35.017, 135.6774, "Quiet, cool air and the sound of leaves moving overhead.", MediaType.IMAGE],
  ["maya", "DUMBO Waterfront", "New York", "USA", 40.7033, -73.9881, "Skyline views and a windy ferry ride back.", MediaType.IMAGE],
  ["maya", "Washington Square Park", "New York", "USA", 40.7308, -73.9973, "Street musicians made the whole square feel alive.", MediaType.VIDEO],
  ["maya", "Mission Dolores Park", "San Francisco", "USA", 37.7596, -122.4269, "Blanket, coffee, and a perfectly clear afternoon.", MediaType.IMAGE],
  ["maya", "Palace of Fine Arts", "San Francisco", "USA", 37.8021, -122.4488, "A slow loop around the lagoon before sunset.", MediaType.IMAGE],
  ["noah", "Plaza de Espana", "Seville", "Spain", 37.3772, -5.9869, "Tiles, light, and so much space to wander.", MediaType.IMAGE],
  ["noah", "Alcazar Gardens", "Seville", "Spain", 37.3831, -5.9902, "The courtyard shadows were unreal in person.", MediaType.IMAGE],
  ["noah", "Trastevere", "Rome", "Italy", 41.8897, 12.4691, "Dinner spilled into the street and nobody wanted to leave.", MediaType.VIDEO],
  ["noah", "Trevi Fountain", "Rome", "Italy", 41.9009, 12.4833, "Yes it is crowded. Yes it is still worth it.", MediaType.IMAGE],
  ["elena", "Christchurch Meadow", "Oxford", "UK", 51.7446, -1.2496, "Fog lifting off the grass made the whole morning glow.", MediaType.IMAGE],
  ["elena", "Portobello Road", "London", "UK", 51.5175, -0.2057, "Found three tiny antiques shops and a great record stall.", MediaType.IMAGE],
  ["elena", "Regent's Canal", "London", "UK", 51.5362, -0.091, "Walking path, boats, coffee, repeat.", MediaType.VIDEO],
  ["leo", "Bondi Icebergs", "Sydney", "Australia", -33.8918, 151.2767, "Ocean pool mornings should be illegal back home.", MediaType.IMAGE],
  ["leo", "Circular Quay", "Sydney", "Australia", -33.8607, 151.212, "Harbour light changed every ten minutes.", MediaType.IMAGE],
  ["leo", "Fitzroy", "Melbourne", "Australia", -37.7986, 144.9787, "Best flat white of the trip, no contest.", MediaType.IMAGE],
  ["maya", "Centro Historico", "Mexico City", "Mexico", 19.4326, -99.1332, "A full afternoon of murals, markets, and coffee.", MediaType.IMAGE],
  ["avery", "Old Port", "Montreal", "Canada", 45.5075, -73.554, "Cold air, warm bagels, and the river iced over.", MediaType.IMAGE]
] as const;

export function assertSafeSeedEnvironment(databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the demo seed while NODE_ENV=production.");
  }

  if (!databaseUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL must be set before running the seed.");
  }

  const parsed = new URL(databaseUrl);
  const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const confirmed = process.env.ALLOW_DESTRUCTIVE_SEED === SEED_CONFIRMATION_TOKEN;

  if (!isLocalHost && !confirmed) {
    throw new Error(
      `Refusing destructive seed against non-local database host "${parsed.hostname}". Re-run with ALLOW_DESTRUCTIVE_SEED=${SEED_CONFIRMATION_TOKEN} if you intentionally want to reseed a demo or staging database.`
    );
  }
}

async function main() {
  assertSafeSeedEnvironment();

  await prisma.friendRequest.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("password123", 10);

  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${user.username}`
      }
    });
  }

  const dbUsers = await prisma.user.findMany();
  const byUsername = new Map(dbUsers.map((user) => [user.username, user]));

  const friendshipPairs = [
    ["avery", "maya"],
    ["avery", "noah"],
    ["avery", "elena"],
    ["maya", "leo"],
    ["noah", "elena"]
  ] as const;

  for (const [left, right] of friendshipPairs) {
    const { userAId, userBId } = normalizeFriendPair(byUsername.get(left)!.id, byUsername.get(right)!.id);
    await prisma.friendship.create({ data: { userAId, userBId } });
  }

  const pendingRequests = [
    ["leo", "avery"],
    ["elena", "maya"]
  ] as const;

  for (const [from, to] of pendingRequests) {
    await prisma.friendRequest.create({
      data: {
        fromUserId: byUsername.get(from)!.id,
        toUserId: byUsername.get(to)!.id,
        status: "PENDING"
      }
    });
  }

  for (const [index, post] of postSeed.entries()) {
    const [username, placeName, city, country, latitude, longitude, caption, mediaType] = post;
    const seedIndex = index + 1;
    await prisma.post.create({
      data: {
        userId: byUsername.get(username)!.id,
        mediaType,
        mediaUrl: mediaType === MediaType.IMAGE
          ? `https://picsum.photos/seed/pinly-${seedIndex}/1200/900`
          : "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        thumbnailUrl: mediaType === MediaType.VIDEO
          ? `https://picsum.photos/seed/pinly-video-${seedIndex}/1200/900`
          : null,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
