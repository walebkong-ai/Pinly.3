"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@/lib/validation";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

type SignUpValues = z.infer<typeof signUpSchema>;

function extractErrorMessage(data: any) {
  const fieldError = data?.issues?.fieldErrors
    ? Object.values(data.issues.fieldErrors).flat().find((value: unknown) => typeof value === "string")
    : null;
  const formError = Array.isArray(data?.issues?.formErrors) ? data.issues.formErrors[0] : null;
  return fieldError ?? formError ?? data?.error ?? null;
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const googleConsentRequired = searchParams.get("legal") === "required";

  const [loading, setLoading] = useState(false);
  const googleUiEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [googleEnabled, setGoogleEnabled] = useState(googleUiEnabled);

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    formState: { errors }
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      acceptLegal: false,
      inviteToken: inviteToken || undefined
    }
  });

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

  async function recordLegalAcceptance(errorMessage: string) {
    try {
      const response = await fetch("/api/auth/legal-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptLegal: true })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(extractErrorMessage(data) ?? errorMessage);
        return false;
      }

      return true;
    } catch {
      toast.error("Could not reach the server. Please try again.");
      return false;
    }
  }

  async function onSubmit(payload: SignUpValues) {
    setLoading(true);

    const recordedConsent = await recordLegalAcceptance("Could not save legal acceptance.");

    if (!recordedConsent) {
      setLoading(false);
      return;
    }

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

      if (data?.error === "Username has been taken") {
        setError("username", { type: "server", message: "Username is already taken" });
        return;
      }

      toast.error(extractErrorMessage(data) ?? "Sign up failed.");
      return;
    }

    const signInResult = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false
    });

    if (signInResult?.error) {
      toast.error("Account created, but automatic sign-in failed. Please sign in.");
      router.push("/sign-in");
      router.refresh();
      return;
    }

    toast.success("Your map is ready. Add a memory or friend to get started.");
    router.push("/map?welcome=1");
    router.refresh();
  }

  async function prepareGoogleSignUp() {
    const accepted = await trigger("acceptLegal");

    if (!accepted) {
      toast.error("Accept the Terms of Service and Privacy Policy to continue.");
      return false;
    }

    return recordLegalAcceptance("Could not start Google sign up.");
  }

  return (
    <div className="space-y-4">
      {googleConsentRequired ? (
        <div className="rounded-2xl border bg-[var(--surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]/68">
          Accept the Terms of Service and Privacy Policy below before continuing with Google.
        </div>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input {...register("name")} placeholder="Full name" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Input 
              {...register("username", {
                onChange: (e) => { e.target.value = e.target.value.toLowerCase(); }
              })}
              placeholder="username" 
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
          </div>
        </div>
        <div>
          <Input {...register("email")} type="email" placeholder="Email" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <Input
            {...register("password")}
            type="password"
            placeholder="Password (8+ characters)"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <div className="rounded-2xl border bg-[var(--surface-soft)] px-4 py-3">
          <label className="flex items-start gap-3 text-sm leading-6 text-[var(--foreground)]/72">
            <input
              type="checkbox"
              {...register("acceptLegal")}
              className="mt-1 h-4 w-4 shrink-0 rounded accent-[var(--foreground)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" rel="noreferrer" className="font-medium text-[var(--accent)] underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-[var(--accent)] underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptLegal && <p className="mt-2 text-xs text-red-500">{errors.acceptLegal.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
        <p className="text-center text-xs text-[var(--foreground)]/48">
          After sign-up, you&apos;ll land on your map with a quick first-run guide.
        </p>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
            or
            <span className="h-px flex-1 bg-[var(--foreground)]/12" />
          </div>
          <GoogleAuthButton
            mode="signup"
            callbackUrl={inviteToken ? `/invite/${inviteToken}` : "/map"}
            beforeAuth={prepareGoogleSignUp}
          />
        </>
      )}
    </div>
  );
}
