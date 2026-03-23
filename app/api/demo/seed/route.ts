import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataset } from "@/lib/demo-data";

/**
 * POST /api/demo/seed
 *
 * Ensures demo users and posts exist in the database.
 * Protected by the DEMO_SEED_SECRET env var — if not set, the endpoint
 * is open (suitable for review/staging). In production, set the secret
 * and pass it in the `x-demo-seed-secret` header.
 */
export async function POST(request: Request) {
  const secret = process.env.DEMO_SEED_SECRET;

  if (secret) {
    const provided = request.headers.get("x-demo-seed-secret");

    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await ensureDemoDataset(prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Demo seed failed:", message);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
