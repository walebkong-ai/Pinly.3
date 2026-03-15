"use client";

import { useEffect, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SaveButton({
  postId,
  initialSaved = false,
  triggerStyle = "inline"
}: {
  postId: string;
  initialSaved?: boolean;
  triggerStyle?: "inline" | "emphasis";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  function toggleSave() {
    const wasSaved = saved;
    setSaved(!wasSaved);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/save`, {
          method: wasSaved ? "DELETE" : "POST"
        });

        if (!response.ok) {
          throw new Error("Could not update saved state");
        }

        const data = await response.json();
        setSaved(Boolean(data.saved));
      } catch {
        setSaved(wasSaved);
        toast.error("Could not update saved posts right now.");
      }
    });
  }

  if (triggerStyle === "emphasis") {
    return (
      <button
        type="button"
        onClick={toggleSave}
        disabled={isPending}
        aria-pressed={saved}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-sm transition active:scale-[0.98]",
          saved
            ? "border-[var(--social-accent)] bg-[var(--social-accent)] text-white"
            : "border-[rgba(255,95,162,0.22)] bg-[var(--social-accent-soft)] text-[var(--foreground)] hover:bg-[rgba(255,95,162,0.18)]"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            saved ? "bg-white/18 text-white" : "bg-[var(--social-accent)] text-white"
          )}
        >
          <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
        </span>
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleSave}
      disabled={isPending}
      aria-pressed={saved}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95",
        saved
          ? "text-[var(--social-accent)]"
          : "text-[var(--foreground)]/55 hover:text-[var(--social-accent)]"
      )}
    >
      <Bookmark
        className={cn(
          "h-5 w-5 transition-all",
          saved && "scale-110 fill-[var(--social-accent)] text-[var(--social-accent)]"
        )}
      />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
