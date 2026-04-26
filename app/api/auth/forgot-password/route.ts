import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJsonBody, toApiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: "forgot-password",
      request: req,
      limit: 5,
      windowMs: 15 * 60 * 1000
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsed = forgotPasswordSchema.safeParse(
      await readJsonBody(req, {
        maxBytes: 4 * 1024,
        invalidJsonMessage: "Invalid email",
        invalidJsonCode: "FORGOT_PASSWORD_INVALID_JSON"
      })
    );

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success anyway, to prevent email enumeration
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Save token to database
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        expiresAt,
      },
    });

    const authBaseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const resetLink = `${authBaseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
      ...(process.env.NODE_ENV !== "production" && process.env.AUTH_DEBUG_RESET_LINKS === "true"
        ? {
            previewResetLink: resetLink
          }
        : {})
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiRequestError") {
      return toApiErrorResponse(error);
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Forgot password error:", error);
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
