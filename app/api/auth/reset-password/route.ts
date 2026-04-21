import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJsonBody, toApiErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100)
});

export async function POST(req: Request) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: "reset-password",
      request: req,
      limit: 10,
      windowMs: 15 * 60 * 1000
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsed = resetPasswordSchema.safeParse(
      await readJsonBody(req, {
        maxBytes: 8 * 1024,
        invalidJsonMessage: "Missing or invalid token",
        invalidJsonCode: "RESET_PASSWORD_INVALID_JSON"
      })
    );

    if (!parsed.success) {
      const newPasswordError = parsed.error.flatten().fieldErrors.newPassword?.[0];

      if (newPasswordError) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }

      return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
    }

    const { token, newPassword } = parsed.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        OR: [{ token: hashedToken }, { token }]
      },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Check expiration
    if (new Date() > resetToken.expiresAt) {
      // Eagerly delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password mapping to the email from the token
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { email: resetToken.email },
    });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiRequestError") {
      return toApiErrorResponse(error);
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Reset password error:", error);
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
