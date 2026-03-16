import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { ensureDemoDataset } from "../lib/demo-data";

const prisma = new PrismaClient();
const SEED_CONFIRMATION_TOKEN = "pinly-demo";

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
  await ensureDemoDataset(prisma);
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
