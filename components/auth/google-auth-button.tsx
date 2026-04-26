"use client";

import { useState } from "react";
import { Apple, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { normalizeAuthCallbackUrl, syncAuthCallbackUrlCookie } from "@/lib/auth-client";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  provider?: "apple" | "google";
  callbackUrl?: string;
  beforeAuth?: () => Promise<boolean>;
};

export function GoogleAuthButton({ mode, provider = "google", callbackUrl = "/map", beforeAuth }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const normalizedCallbackUrl = normalizeAuthCallbackUrl(callbackUrl);
  const providerLabel = provider === "apple" ? "Apple" : "Google";

  async function onSocialAuth() {
    setLoading(true);

    try {
      if (beforeAuth) {
        const canContinue = await beforeAuth();

        if (!canContinue) {
          setLoading(false);
          return;
        }
      }

      syncAuthCallbackUrlCookie(normalizedCallbackUrl);
      await signIn(provider, { callbackUrl: normalizedCallbackUrl });
    } catch {
      setLoading(false);
      toast.error(`${providerLabel} sign in could not start. Please try again.`);
      return;
    }

    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full gap-2"
      onClick={() => {
        void onSocialAuth();
      }}
      disabled={loading}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : provider === "apple" ? (
        <Apple className="h-4 w-4" />
      ) : (
        <span className="text-base">G</span>
      )}
      {mode === "signin" ? `Continue with ${providerLabel}` : `Sign up with ${providerLabel}`}
    </Button>
  );
}
