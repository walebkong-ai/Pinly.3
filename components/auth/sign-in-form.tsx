"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export function SignInForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const googleUiEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [googleEnabled, setGoogleEnabled] = useState(googleUiEnabled);

  useEffect(() => {
    let ignore = false;

    async function loadProviders() {
      try {
        const providers = await getProviders();

        if (!ignore) {
          setGoogleEnabled(googleUiEnabled || Boolean(providers?.google));
        }
      } catch {
        if (!ignore) {
          setGoogleEnabled(googleUiEnabled);
        }
      }
    }

    void loadProviders();

    return () => {
      ignore = true;
    };
  }, []);

  async function onSubmit(formData: FormData) {
    setLoading(true);

    let result: Awaited<ReturnType<typeof signIn>>;

    try {
      result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false
      });
    } catch {
      setLoading(false);
      toast.error("Could not reach the server. Please try again.");
      return;
    }

    setLoading(false);

    if (result?.error) {
      toast.error("That email and password combination did not work.");
      return;
    }

    router.push("/map");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="space-y-4">
        <Input name="email" type="email" placeholder="Email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          minLength={8}
          title="Password must be at least 8 characters."
          required
        />
        <div className="flex items-center justify-between mt-2">
          <Link href="/forgot-password" className="text-sm font-medium text-[var(--accent)] hover:underline ml-auto block">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
            or
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
          </div>
          <GoogleAuthButton mode="signin" />
        </>
      )}
    </div>
  );
}
