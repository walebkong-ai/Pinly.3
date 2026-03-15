"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const email = String(formData.get("email") ?? "");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Unable to process request");
      }

      setSubmitted(true);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 bg-[rgb(var(--background-rgb))]">
      <div className="w-full max-w-sm space-y-6 rounded-[2rem] border bg-white p-8 shadow-sm">
        
        <div className="space-y-2 text-center">
          <h1 className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-[var(--foreground)]/60">
            Enter your email to receive a reset link
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
              <p>If an account exists for that email, a reset link has been sent.</p>
              <p className="mt-2 text-xs opacity-75">(Check the server console in development mode)</p>
            </div>
            <Link href="/sign-in" className="w-full">
              <Button variant="secondary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-4">
            <Input name="email" type="email" placeholder="Email" required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending link..." : "Send reset link"}
            </Button>
          </form>
        )}

        <div className="text-center mt-6">
          <Link href="/sign-in" className="inline-flex items-center text-sm font-medium text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </div>

      </div>
    </div>
  );
}
