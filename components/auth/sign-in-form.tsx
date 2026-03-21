"use client";

import { useEffect, useRef, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { DEFAULT_DEMO_USER_EMAIL, DEMO_PASSWORD } from "@/lib/demo-config";

function normalizeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/map";
  }

  return value;
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));
  const [pendingMode, setPendingMode] = useState<"credentials" | "demo" | null>(null);
  const googleUiEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [googleEnabled, setGoogleEnabled] = useState(googleUiEnabled);
  const autoDemoStartedRef = useRef(false);

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
  }, [googleUiEnabled]);

  async function signInWithEmail(email: string, password: string, mode: "credentials" | "demo") {
    setPendingMode(mode);

    let result: Awaited<ReturnType<typeof signIn>>;

    try {
      result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false
      });
    } catch {
      setPendingMode(null);
      toast.error(mode === "demo" ? "Demo sign in could not reach the server. Please try again." : "Could not reach the server. Please try again.");
      return;
    }

    setPendingMode(null);

    if (result?.error) {
      toast.error(mode === "demo" ? "Demo sign in did not work. Please try again." : "That email and password combination did not work.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function onSubmit(formData: FormData) {
    await signInWithEmail(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""), "credentials");
  }

  async function handleDemoSignIn() {
    await signInWithEmail(DEFAULT_DEMO_USER_EMAIL, DEMO_PASSWORD, "demo");
  }

  useEffect(() => {
    if (searchParams.get("demo") !== "1" || autoDemoStartedRef.current) {
      return;
    }

    autoDemoStartedRef.current = true;
    void handleDemoSignIn();
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <Button type="button" variant="secondary" className="w-full" disabled={pendingMode !== null} onClick={() => void handleDemoSignIn()}>
        {pendingMode === "demo" ? "Opening demo..." : "Continue as demo user"}
      </Button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
        <span className="h-px flex-1 bg-[var(--foreground)]/12" />
        or sign in with email
        <span className="h-px flex-1 bg-[var(--foreground)]/12" />
      </div>
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
        <Button type="submit" className="w-full" disabled={pendingMode !== null}>
          {pendingMode === "credentials" ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
            or
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
          </div>
          <GoogleAuthButton mode="signin" callbackUrl={callbackUrl} />
        </>
      )}
    </div>
  );
}
