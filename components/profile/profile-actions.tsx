// @ts-nocheck
"use client";

import { useState } from "react";
import { MoreHorizontal, UserMinus, ShieldAlert, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";

type ProfileActionsProps = {
  username: string;
  isFriend: boolean;
};

export function ProfileActions({ username, isFriend }: ProfileActionsProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");

  async function handleRemoveFriend() {
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/friends/${username}/remove`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      toast.success(`Removed @${username} from your friends.`);
      setShowRemoveDialog(false);
      router.refresh();
    } catch {
      toast.error("Could not remove friend. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  async function handleBlockUser() {
    setIsBlocking(true);
    try {
      const res = await fetch(`/api/users/${username}/block`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to block user");
      toast.success(`Blocked @${username}. They will no longer be able to interact with you.`);
      setShowBlockDialog(false);
      router.push("/friends");
      router.refresh();
    } catch {
      toast.error("Could not block user. Please try again.");
    } finally {
      setIsBlocking(false);
    }
  }

  async function handleReportUser() {
    setIsReporting(true);
    try {
      const res = await fetch(`/api/users/${username}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reportReason }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to report user");
      toast.success(`Report submitted. Thanks for keeping the community safe.`);
      setShowReportDialog(false);
      setReportReason("");
    } catch {
      toast.error("Could not submit report. Please try again.");
    } finally {
      setIsReporting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full hover:bg-[var(--surface-strong)]">
            <MoreHorizontal className="h-5 w-5 text-[var(--foreground)]/70" />
            <span className="sr-only">Profile options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-[var(--surface-soft)] border border-[var(--surface-strong)]">
          {isFriend && (
            <>
              <DropdownMenuItem 
                onClick={() => setShowRemoveDialog(true)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Remove friend
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--surface-strong)]" />
            </>
          )}
          
          <DropdownMenuItem 
            onClick={() => setShowReportDialog(true)}
            className="rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report user
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowBlockDialog(true)}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-destructive focus:text-destructive cursor-pointer"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Block user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove Friend Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none bg-[var(--surface-soft)] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Remove friend?</DialogTitle>
            <DialogDescription className="text-sm text-[var(--foreground)]/60">
              You will no longer be friends with @{username}. You won't be able to see each other's memories on the map.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="rounded-full" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={handleRemoveFriend} disabled={isRemoving}>
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none bg-[var(--surface-soft)] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Block @{username}?</DialogTitle>
            <DialogDescription className="text-sm text-[var(--foreground)]/60">
              They won't be able to find your profile, see your memories, or send you messages. This will also remove them from your friends list if you are currently friends.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="rounded-full" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={handleBlockUser} disabled={isBlocking}>
              {isBlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report User Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none bg-[var(--surface-soft)] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Report @{username}</DialogTitle>
            <DialogDescription className="text-sm text-[var(--foreground)]/60">
              Is this user violating community guidelines? Please provide a brief reason below.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="e.g. Spam, inappropriate content, harassment..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="min-h-[100px] resize-none rounded-2xl border-[var(--surface-strong)] bg-[var(--surface-strong)]/50 focus-visible:ring-1 focus-visible:ring-[var(--foreground)]/20"
            />
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="rounded-full" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button className="rounded-full bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90" onClick={handleReportUser} disabled={isReporting || reportReason.trim() === ""}>
              {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin hidden" />} {/* hide spinner until logic needed */}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
