import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRecentFeedPosts } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/post/post-card";

export default async function FeedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const posts = await getRecentFeedPosts(session.user.id, 24);

  let showLikeCounts = true;
  let showCommentCounts = true;

  try {
    const settings = await prisma.userSettings.findUnique({ where: { userId: session.user.id } });
    showLikeCounts = settings?.showLikeCounts ?? true;
    showCommentCounts = settings?.showCommentCounts ?? true;
  } catch {
    // Table doesn't exist yet — use safe defaults
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Feed</p>
        <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">Recent memories</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
          Scroll through the latest trips from your circle.
        </p>
      </section>

      <section className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showLikeCounts={showLikeCounts}
            showCommentCounts={showCommentCounts}
          />
        ))}
        {posts.length === 0 && (
          <div className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center">
            <p className="text-sm text-[var(--foreground)]/55">No memories yet. Add your first memory from the map!</p>
          </div>
        )}
      </section>
    </div>
  );
}
