import Link from "next/link";
import { Bookmark } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSavedPosts } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/post/post-card";

export default async function SavedPostsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [posts, settings] = await Promise.all([
    getSavedPosts(session.user.id, 48),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { showLikeCounts: true }
    })
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
            <Bookmark className="h-5 w-5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Saved</p>
            <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">Saved memories</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
              Revisit the posts you bookmarked for later. Saved items still follow normal visibility rules.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showLikeCounts={settings?.showLikeCounts ?? true}
            openOnBodyTap
          />
        ))}
        {posts.length === 0 ? (
          <div className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center">
            <p className="text-sm text-[var(--foreground)]/58">
              You haven&apos;t saved any memories yet.
            </p>
            <Link
              href="/feed"
              className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-95"
            >
              Browse the feed
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
