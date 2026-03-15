import { notFound } from "next/navigation";
import { CalendarDays, Crosshair, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/avatar";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";
import { DeletePostButton } from "@/components/post/delete-post-button";
import { BackButton } from "@/components/post/back-button";
import { LikeButton } from "@/components/post/like-button";
import { CommentSection } from "@/components/post/comment-section";
import { DirectionsSheet } from "@/components/post/directions-sheet";
import { ShareSheet } from "@/components/post/share-sheet";

type Props = {
  params: Promise<{ postId: string }>;
};

export default async function PostDetailPage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { postId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    notFound();
  }

  // Fetch like state and settings — wrapped in try-catch because the Like/UserSettings tables
  // may not exist in production yet if the migration hasn't been applied.
  let liked = false;
  let likeCount = 0;
  let showLikeCounts = true;

  try {
    const [likeRow, count, settings] = await Promise.all([
      prisma.like.findUnique({ where: { postId_userId: { postId: post.id, userId: session.user.id } } }),
      prisma.like.count({ where: { postId: post.id } }),
      prisma.userSettings.findUnique({ where: { userId: session.user.id } })
    ]);
    liked = !!likeRow;
    likeCount = count;
    showLikeCounts = settings?.showLikeCounts ?? true;
  } catch {
    // Tables don't exist yet — use safe defaults
  }

  const commentsEnabled = post.user.settings?.commentsEnabled ?? true;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <BackButton />
      <div className="mx-auto max-w-xl">
        <article className="overflow-hidden rounded-[1.75rem] border bg-[var(--surface-strong)] shadow-sm">
          {/* Media */}
          <div className="aspect-[4/3] md:aspect-[16/10]">
            <MediaView
              mediaType={post.mediaType}
              mediaUrl={post.mediaUrl}
              thumbnailUrl={post.thumbnailUrl}
              postId={post.id}
            />
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            {/* Author row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={post.user.name} src={post.user.avatarUrl} />
                <div>
                  <p className="font-medium">{post.user.name}</p>
                  <p className="text-sm text-[var(--foreground)]/58">@{post.user.username}</p>
                </div>
              </div>
              {session.user.id === post.userId && (
                <DeletePostButton postId={post.id} redirectToMap />
              )}
            </div>

            {/* Place info */}
            <div>
              <h1 className="font-[var(--font-serif)] text-2xl md:text-3xl">{post.placeName}</h1>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-[rgba(56,182,201,0.2)] bg-[rgba(56,182,201,0.1)] px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--map-accent)] text-white shadow-sm">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)]/45">Location</p>
                      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{post.city}, {post.country}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-[rgba(255,159,28,0.22)] bg-[var(--accent-soft)] px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)]/45">Visited</p>
                      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{formatVisitDate(post.visitedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Caption */}
            <p className="text-sm leading-7 text-[var(--foreground)]/76 md:text-base md:leading-8">{post.caption}</p>

            {/* Like + Comment actions */}
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-1">
                <LikeButton postId={post.id} initialLiked={liked} initialCount={likeCount} showCount={showLikeCounts} />
                {commentsEnabled ? (
                  <CommentSection postId={post.id} />
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/50">
                    Comments off
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <DirectionsSheet post={post} label="Directions" triggerStyle="emphasis" />
                <ShareSheet postId={post.id} triggerStyle="emphasis" />
              </div>
            </div>

            {/* Coordinates */}
            <div className="rounded-[1.5rem] border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.08)] p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--map-accent-soft)] text-[var(--map-accent)]">
                  <Crosshair className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Coordinates</p>
                  <p className="mt-1 text-xs text-[var(--foreground)]/62">Exact map pin for this memory</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border bg-[var(--surface-strong)] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--foreground)]/42">Latitude</p>
                  <p className="mt-1 font-mono text-sm font-medium tabular-nums text-[var(--foreground)]">
                    {post.latitude.toFixed(4)}
                  </p>
                </div>
                <div className="rounded-2xl border bg-[var(--surface-strong)] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--foreground)]/42">Longitude</p>
                  <p className="mt-1 font-mono text-sm font-medium tabular-nums text-[var(--foreground)]">
                    {post.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
