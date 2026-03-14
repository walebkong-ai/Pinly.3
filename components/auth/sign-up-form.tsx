"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

function extractErrorMessage(data: any) {
  const fieldError = data?.issues?.fieldErrors
    ? Object.values(data.issues.fieldErrors).flat().find((value: unknown) => typeof value === "string")
    : null;
  const formError = Array.isArray(data?.issues?.formErrors) ? data.issues.formErrors[0] : null;
  return fieldError ?? formError ?? data?.error ?? null;
}

export function SignUpForm() {
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

    const payload = {
      name: String(formData.get("name") ?? ""),
      username: String(formData.get("username") ?? "").toLowerCase(),
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: String(formData.get("password") ?? ""),
      avatarUrl: String(formData.get("avatarUrl") ?? "")
    };

    let response: Response;

    try {
      response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      setLoading(false);
      toast.error("Could not reach the server. Please try again.");
      return;
    }

    setLoading(false);

    if (!response.ok) {
      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      toast.error(extractErrorMessage(data) ?? "Sign up failed.");
      return;
    }

    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false
    });

    toast.success("Your Pinly account is ready.");
    router.push("/map");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form action={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="name" placeholder="Full name" required />
          <Input 
            name="username" 
            placeholder="username" 
            required 
            pattern="[a-z0-9_-]{3,20}" 
            title="Use 3-20 lowercase letters, numbers, underscores, or hyphens"
            onChange={(e) => { e.target.value = e.target.value.toLowerCase(); }}
          />
        </div>
        <Input name="email" type="email" placeholder="Email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password (8+ characters)"
          minLength={8}
          title="Password must be at least 8 characters."
          required
        />
        <Input name="avatarUrl" type="url" placeholder="Avatar URL (optional)" />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
            or
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
          </div>
          <GoogleAuthButton mode="signup" />
        </>
      )}
    </div>
  );
}
