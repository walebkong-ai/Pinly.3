"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, LoaderCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type CommentData = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; username: string; avatarUrl: string | null };
};

export function CommentSection({
  postId,
  showCount = true
}: {
  postId: string;
  showCount?: boolean;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        if (res.status === 403) {
          if (!ignore) {
            setCommentsDisabled(true);
            setComments([]);
          }
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setComments(data.comments ?? []);
        }
      } catch { /* ignore */ }
      finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => { ignore = true; };
  }, [postId]);

  async function addComment() {
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() })
      });
      if (res.status === 403) {
        setCommentsDisabled(true);
        setExpanded(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setInput("");
        // Scroll to bottom after adding
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    } catch { /* ignore */ }
    finally {
      setSubmitting(false);
    }
  }

  const commentCount = comments.length;

  if (commentsDisabled) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/50">
        Comments off
      </span>
    );
  }

  return (
    <div>
      {/* Toggle / header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/55 transition hover:text-[var(--foreground)]/80"
      >
        <MessageCircle className="h-5 w-5" />
        {showCount && <span>{loading ? "…" : commentCount}</span>}
        {!showCount && !expanded && <span>Comments</span>}
      </button>

      {/* Expanded comments */}
      {expanded && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Comment list */}
          <div
            ref={scrollRef}
            className="max-h-64 space-y-3 overflow-y-auto pr-1"
          >
            {loading && (
              <div className="flex justify-center py-4">
                <LoaderCircle className="h-5 w-5 animate-spin text-[var(--foreground)]" />
              </div>
            )}
            {!loading && comments.length === 0 && (
              <p className="py-3 text-center text-xs text-[var(--foreground)]/40">No comments yet. Be the first!</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar name={comment.user.name} src={comment.user.avatarUrl} className="h-7 w-7 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold">{comment.user.name}</span>{" "}
                    <span className="text-[var(--foreground)]/50">@{comment.user.username}</span>
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-[var(--foreground)]/80">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); void addComment(); }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a comment…"
              maxLength={1000}
              className="min-w-0 flex-1 rounded-full border bg-[var(--surface-soft)] px-4 py-2 text-sm outline-none transition focus:border-[var(--foreground)] focus:ring-1 focus:ring-[var(--foreground)]/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
                input.trim()
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "bg-[var(--foreground)]/10 text-[var(--foreground)]/30"
              )}
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
