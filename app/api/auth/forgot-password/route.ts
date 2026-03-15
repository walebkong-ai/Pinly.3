import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

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
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Save token to database
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetLink = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // STUB: Log email delivery
    console.log("=========================================");
    console.log("EMAIL DELIVERY STUB (Forgot Password)");
    console.log(`To: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("=========================================");

    // TODO: Integrate actual email provider here (e.g. Resend, SendGrid)

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
