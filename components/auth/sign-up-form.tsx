"use client";

import { useEffect, useState } from "react";
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

  const [loading, setLoading] = useState(false);
  const googleUiEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [googleEnabled, setGoogleEnabled] = useState(googleUiEnabled);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      avatarUrl: "",
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

  async function onSubmit(payload: SignUpValues) {
    setLoading(true);

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
        <div>
          <Input {...register("avatarUrl")} type="url" placeholder="Avatar URL (optional)" />
          {errors.avatarUrl && <p className="mt-1 text-xs text-red-500">{errors.avatarUrl.message}</p>}
        </div>
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
