import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resetDemoDataset } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { assertSafeSeedEnvironment } from "@/prisma/seed";

export const runtime = "nodejs";

function isResetEnabled() {
  return process.env.PINLY_E2E_MODE === "1";
}

async function clearLocalUploads() {
  const uploadDir = (process.env.UPLOAD_DIR ?? "").trim();

  if (!uploadDir) {
    return;
  }

  const absoluteUploadDir = path.resolve(process.cwd(), uploadDir);
  const publicDir = path.resolve(process.cwd(), "public");
  const relativeToPublic = path.relative(publicDir, absoluteUploadDir);

  if (!relativeToPublic || relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    throw new Error("UPLOAD_DIR must stay inside public/ during e2e reset.");
  }

  await fs.rm(absoluteUploadDir, { recursive: true, force: true });
  await fs.mkdir(absoluteUploadDir, { recursive: true });
}

export async function POST(request: Request) {
  if (!isResetEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    assertSafeSeedEnvironment(undefined, { allowProduction: true });
    await clearLocalUploads();
    await resetDemoDataset(prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown e2e reset failure";
    console.error("E2E reset failed:", message);
    return NextResponse.json({ error: "Reset failed", details: message }, { status: 500 });
  }
}
