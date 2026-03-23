import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, PencilLine } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOwnedCollectionsForPost, getVisiblePostById, getWantToGoPlaceByLocation } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/avatar";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";
import { DeletePostButton } from "@/components/post/delete-post-button";
import { ArchivePostButton } from "@/components/post/archive-post-button";
import { BackButton } from "@/components/post/back-button";
import { LikeButton } from "@/components/post/like-button";
import { CommentSection } from "@/components/post/comment-section";
import { DirectionsSheet } from "@/components/post/directions-sheet";
import { SaveButton } from "@/components/post/save-button";
import { ShareSheet } from "@/components/post/share-sheet";
import { VisitedWithList } from "@/components/post/visited-with-list";
import { ManagePostCollectionsCard } from "@/components/collections/collection-picker";
import { WantToGoButton } from "@/components/places/want-to-go-button";
import { ProfileLink } from "@/components/profile/profile-link";
import { LocationCountryText } from "@/components/ui/country-flag";
import { PostMiniMap } from "@/components/post/post-mini-map";
import { PostSafetyActions } from "@/components/post/post-safety-actions";

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

  const isOwnPost = session.user.id === post.userId;
  const postCollections = isOwnPost ? await getOwnedCollectionsForPost(session.user.id, post.id) : [];
  const wantToGoItem = await getWantToGoPlaceByLocation(session.user.id, post);

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
  const primaryCaption = post.caption.trim() || `Memory from ${post.placeName}`;

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
              priority
            />
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            {/* Author row */}
            <div className="flex items-start justify-between">
              <ProfileLink
                username={post.user.username}
                className="flex min-w-0 items-center gap-3 rounded-[1.25rem] p-1 -m-1 transition hover:bg-[var(--surface-soft)]"
              >
                <Avatar name={post.user.name} src={post.user.avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{post.user.name}</p>
                  <p className="truncate text-sm text-[var(--foreground)]/58">@{post.user.username}</p>
                </div>
              </ProfileLink>
              {isOwnPost && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className="inline-flex h-9 items-center gap-2 rounded-2xl border bg-[var(--surface-soft)] px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--foreground)]/5"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </Link>
                  <ArchivePostButton postId={post.id} initialArchived={post.isArchived ?? false} />
                  <DeletePostButton postId={post.id} redirectToMap />
                </div>
              )}
              {!isOwnPost ? (
                <PostSafetyActions
                  postId={post.id}
                  username={post.user.username}
                  isOwnPost={false}
                  className="h-10 w-10 shrink-0 rounded-full p-0 hover:bg-[var(--surface-soft)]"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]/42">Memory</p>
              <h1 className="font-[var(--font-serif)] text-[2rem] leading-[1.12] text-[var(--foreground)] md:text-[2.7rem] md:leading-[1.08]">
                {primaryCaption}
              </h1>
            </div>

            {post.isArchived ? (
              <div className="rounded-[1.35rem] border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.08)] px-3.5 py-3 text-sm text-[var(--foreground)]/74">
                This memory is archived, so it stays hidden from your feed, map, and normal profile until you restore it.
              </div>
            ) : null}

            {/* Place info */}
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {/* Location card — plain info, no navigation link */}
                <div className="rounded-[1.4rem] border border-[rgba(56,182,201,0.2)] bg-[rgba(56,182,201,0.1)] px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--map-accent)] text-white shadow-sm">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)]/45">Location</p>
                      <p className="mt-1 truncate text-sm font-medium text-[var(--foreground)]">{post.placeName}</p>
                      <LocationCountryText
                        city={post.city}
                        country={post.country}
                        className="mt-1 w-full min-w-0 text-xs text-[var(--foreground)]/62"
                      />
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

              {/* Mini map — replaces the old location-jump behavior */}
              <PostMiniMap
                latitude={post.latitude}
                longitude={post.longitude}
                placeName={post.placeName}
              />
            </div>

            <VisitedWithList friends={post.visitedWith} />

            {isOwnPost ? <ManagePostCollectionsCard postId={post.id} initialCollections={postCollections} /> : null}

            {/* Primary post actions */}
            <div className="border-t pt-4">
              <div className="flex flex-wrap items-center gap-1">
                <LikeButton postId={post.id} initialLiked={liked} initialCount={likeCount} showCount={showLikeCounts} />
                {commentsEnabled ? (
                  <CommentSection postId={post.id} initialCount={post.commentCount} />
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/50">
                    Comments off
                  </span>
                )}
                <SaveButton postId={post.id} initialSaved={post.savedByViewer} />
                <ShareSheet postId={post.id} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <WantToGoButton location={post} initialItemId={wantToGoItem?.id ?? null} triggerStyle="emphasis" />
                <DirectionsSheet post={post} label="Directions" triggerStyle="emphasis" />
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
