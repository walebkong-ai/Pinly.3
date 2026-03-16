"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { shouldDispatchGestureLike } from "@/lib/post-tap-gesture";
import { cn } from "@/lib/utils";

export function LikeButton({
  postId,
  initialLiked = false,
  initialCount = 0,
  showCount = true
}: {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
  showCount?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const likedRef = useRef(initialLiked);
  const countRef = useRef(initialCount);
  const pendingLikeRef = useRef(false);

  useEffect(() => {
    likedRef.current = initialLiked;
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    countRef.current = initialCount;
    setCount(initialCount);
  }, [initialCount]);

  function syncLikeState(nextLiked: boolean, nextCount: number) {
    likedRef.current = nextLiked;
    countRef.current = nextCount;
    setLiked(nextLiked);
    setCount(nextCount);
  }

  function submitLikeChange(wasLiked: boolean) {
    if (pendingLikeRef.current) {
      return;
    }

    const previousCount = countRef.current;
    const nextCount = wasLiked ? Math.max(0, previousCount - 1) : previousCount + 1;
    pendingLikeRef.current = true;
    syncLikeState(!wasLiked, nextCount);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: wasLiked ? "DELETE" : "POST"
        });

        if (response.ok) {
          const data = await response.json();
          syncLikeState(Boolean(data.liked), Number(data.likeCount ?? nextCount));
        } else {
          syncLikeState(wasLiked, previousCount);
          toast.error("Could not update like right now.");
        }
      } catch {
        syncLikeState(wasLiked, previousCount);
        toast.error("Could not update like right now.");
      } finally {
        pendingLikeRef.current = false;
      }
    });
  }

  function toggleLike() {
    submitLikeChange(likedRef.current);
  }

  useEffect(() => {
    function handleDoubleTapLike() {
      if (
        !shouldDispatchGestureLike({
          isLiked: likedRef.current,
          isPending: pendingLikeRef.current
        })
      ) {
        return;
      }

      submitLikeChange(false);
    }

    const eventName = `like-post-${postId}`;
    window.addEventListener(eventName, handleDoubleTapLike);
    return () => window.removeEventListener(eventName, handleDoubleTapLike);
  }, [postId]);

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={isPending}
      data-post-card-control
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95",
        liked
          ? "text-[var(--danger)]"
          : "text-[var(--foreground)]/55 hover:text-[var(--danger)]"
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          liked && "scale-110 fill-[var(--danger)] text-[var(--danger)]"
        )}
      />
      {showCount && count > 0 && <span>{count}</span>}
    </button>
  );
}
