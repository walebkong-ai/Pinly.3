"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock3,
  Flag,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  UserMinus,
  UserPlus,
  X
} from "lucide-react";
import { toast } from "sonner";
import type { RelationshipDetails } from "@/lib/relationships";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportDialog } from "@/components/safety/report-dialog";

type ProfileActionsProps = {
  username: string;
  relationship: RelationshipDetails;
};

export function ProfileActions({ username, relationship }: ProfileActionsProps) {
  const router = useRouter();
  const [isActionPending, setIsActionPending] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isFriend = relationship.status === "friends";
  const isPendingSent = relationship.status === "pending_sent";
  const isPendingReceived = relationship.status === "pending_received";
  const clearActionLabel = isFriend ? "Remove friend" : "Cancel request";

  async function handleAddFriend() {
    setIsActionPending(true);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Could not send friend request.");
      }

      toast.success(data?.autoAccepted ? `You and @${username} are now friends.` : "Friend request sent.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send friend request.");
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleRespond(action: "accept" | "decline") {
    const requestId = relationship.activeRequestId;

    if (!requestId) {
      toast.error("This request is no longer available.");
      router.refresh();
      return;
    }

    setIsActionPending(true);

    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Could not update this request.");
      }

      toast.success(action === "accept" ? "Friend added." : "Request declined.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this request.");
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleClearRelationship() {
    setIsActionPending(true);

    try {
      const res = await fetch(`/api/friends/${username}/remove`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Could not update this relationship.");
      }

      toast.success(isFriend ? `Removed @${username} from your friends.` : "Friend request canceled.");
      setShowClearDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this relationship.");
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleBlockUser() {
    setIsBlocking(true);

    try {
      const res = await fetch(`/api/users/${username}/block`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Could not block this user.");
      }

      toast.success(`Blocked @${username}.`);
      setShowBlockDialog(false);
      router.push("/friends");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not block this user.");
    } finally {
      setIsBlocking(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {relationship.status === "none" ? (
          <Button onClick={() => void handleAddFriend()} disabled={isActionPending} className="rounded-full px-5">
            {isActionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Add Friend
          </Button>
        ) : null}

        {isPendingSent ? (
          <>
            <Button variant="secondary" disabled className="rounded-full px-5 opacity-80">
              <Clock3 className="mr-2 h-4 w-4" />
              Pending
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(true)}
              disabled={isActionPending}
              className="rounded-full px-4"
            >
              Cancel
            </Button>
          </>
        ) : null}

        {isPendingReceived ? (
          <>
            <Button onClick={() => void handleRespond("accept")} disabled={isActionPending} className="rounded-full px-5">
              {isActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Accept
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleRespond("decline")}
              disabled={isActionPending}
              className="rounded-full px-4"
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </>
        ) : null}

        {isFriend ? (
          <Button variant="secondary" disabled className="rounded-full px-5 opacity-80">
            <Check className="mr-2 h-4 w-4" />
            Friends
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 shrink-0 rounded-full p-0 hover:bg-[var(--surface-strong)]">
              <MoreHorizontal className="h-5 w-5 text-[var(--foreground)]/70" />
              <span className="sr-only">Profile options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-[var(--surface-strong)] bg-[var(--surface-soft)] p-2">
            {(isFriend || isPendingSent) ? (
              <>
                <DropdownMenuItem
                  onClick={() => setShowClearDialog(true)}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  {clearActionLabel}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--surface-strong)]" />
              </>
            ) : null}

            <DropdownMenuItem
              onClick={() => setShowReportDialog(true)}
              className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium"
            >
              <Flag className="mr-2 h-4 w-4" />
              Report user
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-destructive focus:text-destructive"
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="pinly-dialog-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{clearActionLabel}?</DialogTitle>
            <DialogDescription className="text-sm text-[var(--foreground)]/60">
              {isFriend
                ? `You and @${username} will stop sharing memories, map access, and direct messaging.`
                : `Your outgoing friend request to @${username} will be removed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="rounded-full" onClick={() => setShowClearDialog(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              className="rounded-full"
              onClick={() => void handleClearRelationship()}
              disabled={isActionPending}
            >
              {isActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {clearActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="pinly-dialog-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Block @{username}?</DialogTitle>
            <DialogDescription className="text-sm text-[var(--foreground)]/60">
              They won&apos;t be able to find your profile, see your memories, or send you requests or messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="rounded-full" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="rounded-full" onClick={() => void handleBlockUser()} disabled={isBlocking}>
              {isBlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Block user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        endpoint={`/api/users/${username}/report`}
        title={`Report @${username}`}
        description="Choose the issue that fits best, then add details if they would help a review."
        successMessage="User report submitted."
      />
    </>
  );
}
