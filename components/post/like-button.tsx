"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
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

  function toggleLike() {
    const wasLiked = liked;
    // Optimistic update
    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: wasLiked ? "DELETE" : "POST"
        });
        if (response.ok) {
          const data = await response.json();
          setLiked(data.liked);
          setCount(data.likeCount);
        } else {
          // Revert optimistic update
          setLiked(wasLiked);
          setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
        }
      } catch {
        setLiked(wasLiked);
        setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
      }
    });
  }

  useEffect(() => {
    function handleDoubleTapLike() {
      if (!liked) {
        toggleLike();
      }
    }
    const eventName = `like-post-${postId}`;
    window.addEventListener(eventName, handleDoubleTapLike);
    return () => window.removeEventListener(eventName, handleDoubleTapLike);
  }, [postId, liked]);

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95",
        liked
          ? "text-[var(--social-accent)]"
          : "text-[var(--foreground)]/55 hover:text-[var(--social-accent)]"
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          liked && "scale-110 fill-[var(--social-accent)] text-[var(--social-accent)]"
        )}
      />
      {showCount && count > 0 && <span>{count}</span>}
    </button>
  );
}
