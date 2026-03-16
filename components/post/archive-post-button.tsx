"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ArchivePostButton({
  postId,
  initialArchived = false,
  className,
  compact = false
}: {
  postId: string;
  initialArchived?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [archived, setArchived] = useState(initialArchived);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!archived) {
      const confirmed = window.confirm("Hide this memory from your feed, map, and profile? You can restore it later from Archived posts.");
      if (!confirmed) {
        return;
      }
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/posts/${postId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !archived })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not update archive state.");
      }

      const data = await response.json();
      const nextArchived = Boolean(data.post?.isArchived);
      setArchived(nextArchived);
      toast.success(nextArchived ? "Memory archived." : "Memory restored.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update archive state.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "gap-2 rounded-2xl",
        archived
          ? "border-[rgba(56,182,201,0.22)] bg-[rgba(56,182,201,0.08)] text-[var(--foreground)] hover:bg-[rgba(56,182,201,0.14)]"
          : "bg-[var(--surface-soft)] text-[var(--foreground)]/74 hover:bg-[var(--surface-strong)]",
        compact ? "h-10 px-3 text-sm" : "h-9 px-3",
        className
      )}
    >
      {isPending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : archived ? (
        <RotateCcw className="h-4 w-4 text-[var(--map-accent)]" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      {archived ? "Restore" : "Archive"}
    </Button>
  );
}
