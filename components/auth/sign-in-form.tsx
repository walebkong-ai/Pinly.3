"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { normalizeAuthCallbackUrl, syncAuthCallbackUrlCookie } from "@/lib/auth-client";
import { DEFAULT_DEMO_USER_EMAIL, DEMO_PASSWORD } from "@/lib/demo-config";

function getSignInErrorMessage(
  mode: "credentials" | "demo",
  code: string | undefined
) {
  if (code === "auth_unavailable") {
    if (process.env.NODE_ENV !== "production") {
      return "Local sign in could not reach the database. Check DATABASE_URL/DIRECT_URL and the auth debug logs.";
    }

    return "Sign in is temporarily unavailable. Please try again.";
  }

  return mode === "demo"
    ? "Demo sign in did not work. Please try again."
    : "That email and password combination did not work.";
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = normalizeAuthCallbackUrl(searchParams.get("callbackUrl"));
  const [pendingMode, setPendingMode] = useState<"credentials" | "demo" | null>(null);
  const [appleEnabled, setAppleEnabled] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const autoDemoStartedRef = useRef(false);

  useEffect(() => {
    let ignore = false;

    async function loadProviders() {
      try {
        const response = await fetch("/api/auth/providers", { cache: "no-store" });
        const providers = response.ok ? await response.json() : null;

        if (!ignore) {
          setAppleEnabled(Boolean(providers?.apple));
          setGoogleEnabled(Boolean(providers?.google));
        }
      } catch {
        if (!ignore) {
          setAppleEnabled(false);
          setGoogleEnabled(false);
        }
      }
    }

    void loadProviders();

    return () => {
      ignore = true;
    };
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, mode: "credentials" | "demo") => {
      setPendingMode(mode);

      let result: Awaited<ReturnType<typeof signIn>>;

      try {
        syncAuthCallbackUrlCookie(callbackUrl);
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
        toast.error(getSignInErrorMessage(mode, result.code));
        if (process.env.NODE_ENV !== "production") {
          console.info("[auth:client] sign_in_failed", {
            mode,
            callbackUrl,
            error: result.error,
            code: result.code,
            url: result.url ?? null
          });
        }
        return;
      }

      const destination = normalizeAuthCallbackUrl(result?.url ?? callbackUrl, callbackUrl);

      if (process.env.NODE_ENV !== "production") {
        console.info("[auth:client] sign_in_success", {
          mode,
          callbackUrl,
          resultUrl: result?.url ?? null,
          destination
        });
      }

      router.replace(destination);
      router.refresh();
    },
    [callbackUrl, router]
  );

  async function onSubmit(formData: FormData) {
    await signInWithEmail(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""), "credentials");
  }

  const handleDemoSignIn = useCallback(async () => {
    // Demo credentials auto-provision the reserved dataset during authorize().
    await signInWithEmail(DEFAULT_DEMO_USER_EMAIL, DEMO_PASSWORD, "demo");
  }, [signInWithEmail]);

  useEffect(() => {
    if (searchParams.get("demo") !== "1" || autoDemoStartedRef.current) {
      return;
    }

    autoDemoStartedRef.current = true;
    void handleDemoSignIn();
  }, [handleDemoSignIn, searchParams]);

  useEffect(() => {
    syncAuthCallbackUrlCookie(callbackUrl);
  }, [callbackUrl]);

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <Button
        type="button"
        variant="secondary"
        className="min-h-[2.625rem] w-full text-sm sm:min-h-[var(--pinly-control-height)] sm:text-[0.9375rem]"
        disabled={pendingMode !== null}
        onClick={() => void handleDemoSignIn()}
      >
        {pendingMode === "demo" ? "Opening demo..." : "Continue as demo user"}
      </Button>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.13em] text-[var(--foreground)]/45 sm:gap-3 sm:text-xs sm:tracking-[0.12em]">
        <span className="h-px flex-1 bg-[var(--foreground)]/12" />
        or sign in with email
        <span className="h-px flex-1 bg-[var(--foreground)]/12" />
      </div>
      <form action={onSubmit} className="space-y-2.5 sm:space-y-4">
        <Input className="min-h-[2.625rem] sm:min-h-[var(--pinly-control-height)]" name="email" type="email" placeholder="Email" required />
        <Input
          className="min-h-[2.625rem] sm:min-h-[var(--pinly-control-height)]"
          name="password"
          type="password"
          placeholder="Password"
          minLength={8}
          title="Password must be at least 8 characters."
          required
        />
        <div className="mt-0.5 flex items-center justify-between sm:mt-2">
          <Link href="/forgot-password" className="ml-auto block text-xs font-medium text-[var(--accent)] hover:underline sm:text-sm">
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          className="min-h-[2.625rem] w-full text-sm sm:min-h-[var(--pinly-control-height)] sm:text-[0.9375rem]"
          disabled={pendingMode !== null}
        >
          {pendingMode === "credentials" ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      {(appleEnabled || googleEnabled) && (
        <>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.13em] text-[var(--foreground)]/45 sm:gap-3 sm:text-xs sm:tracking-[0.12em]">
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
            or
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
          </div>
          <div className="space-y-2">
            {appleEnabled ? <GoogleAuthButton mode="signin" provider="apple" callbackUrl={callbackUrl} /> : null}
            {googleEnabled ? <GoogleAuthButton mode="signin" provider="google" callbackUrl={callbackUrl} /> : null}
          </div>
        </>
      )}
    </div>
  );
}
