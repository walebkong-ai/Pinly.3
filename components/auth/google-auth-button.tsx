"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  callbackUrl?: string;
  beforeAuth?: () => Promise<boolean>;
};

export function GoogleAuthButton({ mode, callbackUrl = "/map", beforeAuth }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onGoogleAuth() {
    setLoading(true);

    try {
      if (beforeAuth) {
        const canContinue = await beforeAuth();

        if (!canContinue) {
          setLoading(false);
          return;
        }
      }

      await signIn("google", { callbackUrl });
    } catch {
      setLoading(false);
      toast.error("Google sign in could not start. Please try again.");
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
        void onGoogleAuth();
      }}
      disabled={loading}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span className="text-base">G</span>}
      {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
    </Button>
  );
}
