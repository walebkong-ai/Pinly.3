import Link from "next/link";
import { MapPin } from "lucide-react";
import type { PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";
import { LikeButton } from "@/components/post/like-button";
import { CommentSection } from "@/components/post/comment-section";
import { ShareSheet } from "@/components/post/share-sheet";

export function PostCard({
  post,
  compact = false,
  showLikeCounts = true,
  showCommentCounts = true
}: {
  post: PostSummary;
  compact?: boolean;
  showLikeCounts?: boolean;
  showCommentCounts?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border bg-[var(--surface-strong)] shadow-sm">
      <div className={compact ? "aspect-[4/3]" : "aspect-[4/3]"}>
        <MediaView
          mediaType={post.mediaType}
          mediaUrl={post.mediaUrl}
          thumbnailUrl={post.thumbnailUrl}
          postId={post.id}
        />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{post.user.name}</p>
            <p className="truncate text-xs text-[var(--foreground)]/55">@{post.user.username}</p>
          </div>
        </div>
        <div>
          <div className="flex items-start gap-2 text-sm text-[var(--foreground)]/68 min-w-0">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--map-accent)]" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--foreground)] truncate">{post.placeName}</p>
              <p className="truncate">
                {post.city}, {post.country}
              </p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground)]/72">{post.caption}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">
            Visited {formatVisitDate(post.visitedAt)}
          </p>
        </div>

        {/* Like + Comment + Share + Open */}
        <div className="flex flex-wrap items-center gap-1 border-t pt-2">
          <LikeButton postId={post.id} showCount={showLikeCounts} />
          <CommentSection postId={post.id} showCount={showCommentCounts} />
          <ShareSheet postId={post.id} />
          <Link href={`/posts/${post.id}`} className="ml-auto text-xs font-medium text-[var(--foreground)]/72 transition hover:text-[var(--foreground)]">
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}
