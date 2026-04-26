"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChangePasswordCardProps = {
  isDemoAccount?: boolean;
};

export function ChangePasswordCard({
  isDemoAccount = false
}: ChangePasswordCardProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDemoAccount || isSubmitting) {
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Choose a new password different from your current one.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Your session is no longer active. Please sign in again.");
          router.replace("/sign-in?callbackUrl=/settings");
          router.refresh();
          return;
        }

        throw new Error(payload?.error ?? "Could not update password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)]/10 text-[var(--foreground)]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Change password</p>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground)]/68">
            Update the password you use for email sign-in on this account.
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/56">
            If you signed in with Google or do not remember your current password,{" "}
            <Link href="/forgot-password" className="font-medium underline underline-offset-4">
              reset it by email
            </Link>
            .
          </p>
        </div>
      </div>

      {isDemoAccount ? (
        <div className="mt-4 rounded-[1.25rem] border border-[rgba(180,35,24,0.18)] bg-[rgba(180,35,24,0.05)] p-4 text-sm leading-6 text-[var(--foreground)]/72">
          Reserved demo accounts keep the shared demo password so the seeded test flow stays predictable.
        </div>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium">
              Current password
            </label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[var(--foreground)]/56">
              Use at least 8 characters. Changing your password does not sign out other devices automatically.
            </p>
            <Button type="submit" className="gap-2 self-start sm:self-auto" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
