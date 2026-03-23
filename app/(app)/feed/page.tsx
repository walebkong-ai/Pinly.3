import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Feed</p>
        <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">Recent memories</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
          Scroll through the latest trips from your circle.
        </p>
      </section>

      <OnThisDaySection groups={onThisDayGroups} />

      <section className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showLikeCounts={showLikeCounts}
            openOnBodyTap
          />
        ))}
        {posts.length === 0 && (
          <div className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Getting started</p>
            <h2 className="font-[var(--font-serif)] text-xl">Your feed is empty</h2>
            <p className="text-sm leading-6 text-[var(--foreground)]/60">
              Memories from you and your friends will show up here. Start by creating your first memory or adding friends.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
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
  );
}
