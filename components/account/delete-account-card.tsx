"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type DeleteAccountCardProps = {
  username: string;
  isDemoAccount?: boolean;
  variant?: "settings" | "page";
};

const deletionConsequences = [
  "Your Pinly profile, memories, collections, comments, likes, saves, want-to-go places, blocks, reports, and friend relationships are permanently removed.",
  "Direct conversations that involve this account are deleted. Messages you sent in group chats are removed, and any remaining group is kept usable by transferring ownership when needed.",
  "Reset tokens and invite links created by this account are deleted. Uploaded post and avatar files stored by Pinly are removed from Supabase storage when available."
];

export function DeleteAccountCard({
  username,
  isDemoAccount = false,
  variant = "settings"
}: DeleteAccountCardProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const normalizedConfirmation = confirmationValue.trim().toUpperCase();
  const isConfirmationValid = normalizedConfirmation === "DELETE";
  const deleteButtonLabel = variant === "settings" ? "Delete account" : "Delete this account";
  const surfaceClassName =
    variant === "settings"
      ? "rounded-[1.75rem] border border-[rgba(180,35,24,0.18)] bg-[rgba(180,35,24,0.05)] p-4"
      : "rounded-[2rem] border border-[rgba(180,35,24,0.16)] bg-[rgba(180,35,24,0.05)] p-5 sm:p-6";
  const callbackBaseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const deletedCallbackUrl = `${callbackBaseUrl}/delete-account?deleted=1`;
  const signInCallbackUrl = `${callbackBaseUrl}/sign-in?callbackUrl=/delete-account`;

  const headingText = useMemo(() => {
    if (isDemoAccount) {
      return "Reserved demo accounts stay locked";
    }

    return "Delete account";
  }, [isDemoAccount]);

  async function handleDeleteAccount() {
    if (!isConfirmationValid || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: normalizedConfirmation })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Your session is no longer active. Please sign in again.");
          router.replace(signInCallbackUrl);
          router.refresh();
          return;
        }

        throw new Error(payload?.error ?? "Could not delete account.");
      }

      if (payload?.summary?.mediaDeletionFailed) {
        toast.success("Account deleted. Media cleanup is still finishing in storage.");
      } else {
        toast.success("Account deleted.");
      }

      router.replace(deletedCallbackUrl);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account.");
      setIsDeleting(false);
    }
  }

  return (
    <section className={surfaceClassName}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(180,35,24,0.12)] text-[var(--danger)]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--danger)]">{headingText}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground)]/68">
            {isDemoAccount
              ? "Pinly's seeded demo users are recreated for testing, so this destructive flow is disabled for them."
              : "This permanently removes your account and the content Pinly can still attribute to it. The action cannot be undone."}
          </p>
          {isDemoAccount ? (
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/56">
              If you need a clean slate while testing, sign in with a non-demo account instead of a reserved `@pinly.demo` user.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/56">
              You will be signed out immediately after deletion, and the same device will need a fresh sign-in to access Pinly again.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isDemoAccount ? (
          <Link href="/delete-account" className="text-xs font-medium text-[var(--foreground)]/62 underline underline-offset-4">
            View the policy page
          </Link>
        ) : (
          <div className="text-xs leading-5 text-[var(--foreground)]/56">
            Open this only when you are certain. Type <span className="font-semibold text-[var(--danger)]">DELETE</span> in the final step.
          </div>
        )}

        <Button
          variant="danger"
          className="h-11 rounded-full px-4"
          onClick={() => setIsDialogOpen(true)}
          disabled={isDemoAccount}
        >
          {deleteButtonLabel}
        </Button>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isDeleting) {
            return;
          }

          setIsDialogOpen(nextOpen);

          if (!nextOpen) {
            setConfirmationValue("");
          }
        }}
      >
        <DialogContent className="pinly-dialog-surface sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[var(--danger)]">Delete @{username}?</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[var(--foreground)]/64">
              This is permanent. Pinly will delete the account, remove content it owns, and sign you out on success.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[1.5rem] border bg-white/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]/48">
              What happens next
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground)]/72">
              {deletionConsequences.map((consequence) => (
                <li key={consequence} className="list-disc pl-1 ml-5">
                  {consequence}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="delete-account-confirmation" className="text-sm font-medium">
              Type DELETE to confirm
            </label>
            <Input
              id="delete-account-confirmation"
              value={confirmationValue}
              onChange={(event) => setConfirmationValue(event.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setIsDialogOpen(false);
                setConfirmationValue("");
              }}
              disabled={isDeleting}
            >
              Keep account
            </Button>
            <Button
              variant="danger"
              className="rounded-full"
              onClick={() => void handleDeleteAccount()}
              disabled={!isConfirmationValid || isDeleting}
            >
              {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
