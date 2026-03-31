import Link from "next/link";
import { redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { auth } from "@/lib/auth";
import { getRecentFeedPosts } from "@/lib/data";
import { OnThisDaySection } from "@/components/feed/on-this-day-section";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import { getOnThisDayMemoryGroups } from "@/lib/on-this-day";
import { PostCard } from "@/components/post/post-card";

async function getFeedSettings(userId: string) {
  try {
    return await prisma.userSettings.findUnique({
      where: { userId },
      select: { showLikeCounts: true }
    });
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return null;
    }

    throw error;
  }
}

export default async function FeedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [posts, onThisDayGroups, settings] = await Promise.all([
    getRecentFeedPosts(session.user.id, 24),
    getOnThisDayMemoryGroups(session.user.id),
    getFeedSettings(session.user.id)
  ]);
  const showLikeCounts = settings?.showLikeCounts ?? true;

  return (
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <section className="glass-panel pinly-panel">
          <p className="pinly-eyebrow">Feed</p>
          <h1 className="pinly-display-title">Recent memories</h1>
          <p className="pinly-body-copy">
            Scroll through the latest trips from your circle.
          </p>
        </section>

        <OnThisDaySection groups={onThisDayGroups} />

        <section className="pinly-screen-stack">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showLikeCounts={showLikeCounts}
              openOnBodyTap
            />
          ))}
          {posts.length === 0 && (
            <div className="pinly-list-empty rounded-[var(--pinly-panel-radius-lg)] border bg-[var(--surface-strong)] text-center space-y-4">
              <p className="pinly-eyebrow">Getting started</p>
              <h2 className="pinly-section-title font-[var(--font-serif)]">Your feed is empty</h2>
              <p className="text-sm leading-6 text-[var(--foreground)]/60">
                Memories from you and your friends will show up here. Start by creating your first memory or adding friends.
              </p>
              <div className="pinly-action-row justify-center">
                <Link href="/create" className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90">
                  Create your first memory
                </Link>
                <Link href="/friends" className="inline-flex items-center justify-center gap-2 rounded-full border bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--foreground)]/5">
                  Add friends
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppScreen>
  );
}
