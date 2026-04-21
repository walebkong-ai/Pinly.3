import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoDataset } from "@/lib/demo-data";

/**
 * POST /api/demo/seed
 *
 * Ensures demo users and posts exist in the database.
 * Protected by the DEMO_SEED_SECRET env var. In production, the endpoint
 * is disabled unless the secret is configured and supplied via the
 * `x-demo-seed-secret` header.
 */
export async function POST(request: Request) {
  const secret = process.env.DEMO_SEED_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provided = request.headers.get("x-demo-seed-secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDemoDataset(prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Demo seed failed:", message);
    }
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
