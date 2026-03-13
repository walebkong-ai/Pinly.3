"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton({ mode }: { mode: "signin" | "signup" }) {
  const [loading, setLoading] = useState(false);

  async function onGoogleAuth() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/map" });
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
