import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
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

    // Invalidate the token so it cannot be reused
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
