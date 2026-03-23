"use client";

import { useState } from "react";
import { Flag, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/safety/report-dialog";

type PostSafetyActionsProps = {
  postId: string;
  username: string;
  isOwnPost?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};

export function PostSafetyActions({
  postId,
  username,
  isOwnPost = false,
  align = "end",
  className
}: PostSafetyActionsProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);

  if (isOwnPost) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={className ?? "h-10 w-10 shrink-0 rounded-full p-0 hover:bg-[var(--surface-soft)]"}
            data-post-card-control
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-5 w-5 text-[var(--foreground)]/70" />
            <span className="sr-only">Post options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          className="w-56 rounded-2xl border border-[var(--surface-strong)] bg-[var(--surface-soft)] p-2"
        >
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              setShowReportDialog(true);
            }}
            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        endpoint={`/api/posts/${postId}/report`}
        title="Report post"
        description={`Tell us what feels wrong about this memory from @${username}.`}
        successMessage="Post report submitted."
      />
    </>
  );
}
