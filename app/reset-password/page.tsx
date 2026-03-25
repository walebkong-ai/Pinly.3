"use client";

import { useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Invalid or missing reset token. Please request a new link.
        </div>
        <Link href="/forgot-password" className="w-full">
          <Button variant="secondary" className="w-full">
            Request Reset Link
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center justify-center space-y-3 rounded-xl bg-green-50 p-6 text-green-700">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-green-800">Password Updated</h3>
            <p className="text-sm">Your password has been successfully reset.</p>
          </div>
        </div>
        <Link href="/sign-in" className="w-full">
          <Button className="w-full">
            Sign in to your account
          </Button>
        </Link>
      </div>
    );
  }

  async function onSubmit(formData: FormData) {
    const newPassword = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to reset password");
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Input
        name="password"
        type="password"
        placeholder="New password"
        minLength={8}
        required
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        minLength={8}
        required
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="pinly-centered-page flex flex-col items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-sm space-y-6 rounded-[2rem] border bg-[var(--surface-strong)] p-8 shadow-sm">
        
        <div className="space-y-2 text-center">
          <h1 className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
            Create new password
          </h1>
          <p className="text-sm text-[var(--foreground)]/60">
            Please enter your new password below.
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-[var(--foreground)]/50">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
