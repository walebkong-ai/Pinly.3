import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
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

  // Fetch like state and settings in parallel
  const [liked, likeCount, settings] = await Promise.all([
    prisma.like.findUnique({ where: { postId_userId: { postId: post.id, userId: session.user.id } } }).then((l) => !!l),
    prisma.like.count({ where: { postId: post.id } }),
    prisma.userSettings.findUnique({ where: { userId: session.user.id } })
  ]);

  const showLikeCounts = settings?.showLikeCounts ?? true;
  const showCommentCounts = settings?.showCommentCounts ?? true;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <BackButton />
      <div className="mx-auto max-w-xl">
        <article className="overflow-hidden rounded-[1.75rem] border bg-white/80 shadow-sm">
          {/* Media */}
          <div className="aspect-[4/3] md:aspect-[16/10]">
            <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
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
              <div className="mt-2 flex items-start gap-2 text-sm text-[var(--foreground)]/68">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <div>
                  <p>{post.city}, {post.country}</p>
                  <p className="text-xs">Visited {formatVisitDate(post.visitedAt)}</p>
                </div>
              </div>
            </div>

            {/* Caption */}
            <p className="text-sm leading-7 text-[var(--foreground)]/76 md:text-base md:leading-8">{post.caption}</p>

            {/* Like + Comment actions */}
            <div className="flex items-center gap-1 border-t pt-3">
              <LikeButton postId={post.id} initialLiked={liked} initialCount={likeCount} showCount={showLikeCounts} />
              <CommentSection postId={post.id} showCount={showCommentCounts} />
            </div>

            {/* Coordinates */}
            <div className="rounded-2xl border bg-white/70 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Coordinates</p>
              <p className="mt-1.5 text-sm">
                {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
