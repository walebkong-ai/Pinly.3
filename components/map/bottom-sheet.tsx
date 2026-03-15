"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BottomSheet({
  post,
  onClose
}: {
  post: PostSummary | null;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-[760] flex justify-center p-3 transition-all duration-400 ease-out will-change-[transform,opacity]",
        post ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
    >
      <div className="pointer-events-auto glass-panel w-full max-w-3xl rounded-[2rem] p-3 shadow-2xl shadow-black/20">
        {post && (
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={post.user.name} src={post.user.avatarUrl} />
                  <div>
                    <p className="font-medium">{post.user.name}</p>
                    <p className="text-sm text-[var(--foreground)]/58">@{post.user.username}</p>
                  </div>
                </div>
                <Button variant="ghost" className="rounded-full p-2" onClick={onClose} aria-label="Close sheet">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Expanded memory</p>
                <h2 className="mt-2 font-[var(--font-serif)] text-3xl">{post.placeName}</h2>
                <p className="mt-2 text-sm text-[var(--foreground)]/62">
                  {post.city}, {post.country} · Visited {formatVisitDate(post.visitedAt)}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--foreground)]/74">{post.caption}</p>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
                <Link href={`/posts/${post.id}`} className="w-full sm:w-auto">
                  <Button className="w-full">Open full post</Button>
                </Link>
                <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
