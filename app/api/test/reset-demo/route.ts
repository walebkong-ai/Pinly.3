import { NextResponse } from "next/server";
import { resetDemoDataset } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { assertSafeSeedEnvironment } from "@/prisma/seed";

export const runtime = "nodejs";

function isResetEnabled() {
  return process.env.PINLY_E2E_MODE === "1";
}

export async function POST(request: Request) {
  if (!isResetEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    assertSafeSeedEnvironment(undefined, { allowProduction: true });
    await resetDemoDataset(prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown e2e reset failure";
    console.error("E2E reset failed:", message);
    return NextResponse.json({ error: "Reset failed", details: message }, { status: 500 });
  }
}
