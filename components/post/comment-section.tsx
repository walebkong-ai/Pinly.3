"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CornerDownRight, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ReplyData = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; username: string; avatarUrl: string | null };
};

type CommentData = ReplyData & {
  replies: ReplyData[];
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
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null);
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
          if (!ignore) {
            setComments(data.comments ?? []);
          }
        }
      } catch {
        // Ignore fetch failures for now and keep the rest of the post usable.
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [postId]);

  async function submitComment(parentId?: string) {
    const draft = (parentId ? replyInput : input).trim();
    if (!draft) {
      return;
    }

    if (parentId) {
      setReplySubmittingId(parentId);
    } else {
      setSubmitting(true);
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft,
          ...(parentId ? { parentId } : {})
        })
      });

      if (res.status === 403) {
        setCommentsDisabled(true);
        setExpanded(false);
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      if (parentId) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === parentId
              ? {
                  ...comment,
                  replies: [...comment.replies, data.comment]
                }
              : comment
          )
        );
        setReplyInput("");
        setReplyTargetId(null);
      } else {
        setComments((prev) => [...prev, data.comment]);
        setInput("");
      }

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } finally {
      if (parentId) {
        setReplySubmittingId(null);
      } else {
        setSubmitting(false);
      }
    }
  }

  const commentCount = comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);

  if (commentsDisabled) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/50">
        Comments off
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/55 transition hover:text-[var(--foreground)]/80"
      >
        <MessageCircle className="h-5 w-5" />
        {showCount ? <span>{loading ? "…" : commentCount}</span> : null}
        {!showCount && !expanded ? <span>Comments</span> : null}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <LoaderCircle className="h-5 w-5 animate-spin text-[var(--foreground)]" />
              </div>
            ) : null}

            {!loading && comments.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--foreground)]/40">No comments yet. Be the first!</p>
            ) : null}

            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex gap-2">
                  <Avatar name={comment.user.name} src={comment.user.avatarUrl} className="h-7 w-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-semibold">{comment.user.name}</span>
                      <span className="text-[var(--foreground)]/50">@{comment.user.username}</span>
                      <span className="text-[var(--foreground)]/40">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-[var(--foreground)]/80">{comment.content}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTargetId((current) => (current === comment.id ? null : comment.id));
                        setReplyInput("");
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--map-accent)] transition hover:text-[var(--foreground)]"
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                      Reply
                    </button>

                    {replyTargetId === comment.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitComment(comment.id);
                        }}
                        className="mt-2 flex items-center gap-2 rounded-2xl border bg-[var(--surface-soft)] px-2 py-2"
                      >
                        <input
                          value={replyInput}
                          onChange={(event) => setReplyInput(event.target.value)}
                          placeholder={`Reply to ${comment.user.name}...`}
                          maxLength={1000}
                          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!replyInput.trim() || replySubmittingId === comment.id}
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                            replyInput.trim()
                              ? "bg-[var(--map-accent)] text-white"
                              : "bg-[var(--foreground)]/10 text-[var(--foreground)]/30"
                          )}
                        >
                          {replySubmittingId === comment.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                {comment.replies.length > 0 ? (
                  <div className="ml-9 space-y-2 border-l border-[var(--foreground)]/10 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <Avatar name={reply.user.name} src={reply.user.avatarUrl} className="h-6 w-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="font-semibold">{reply.user.name}</span>
                            <span className="text-[var(--foreground)]/50">@{reply.user.username}</span>
                            <span className="text-[var(--foreground)]/40">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </p>
                          <p className="mt-0.5 text-sm leading-5 text-[var(--foreground)]/78">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitComment();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
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
      ) : null}
    </div>
  );
}
