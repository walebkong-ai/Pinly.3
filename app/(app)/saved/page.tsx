import Link from "next/link";
import { Bookmark } from "lucide-react";
import { redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
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
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <section className="glass-panel pinly-panel">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
              <Bookmark className="h-5 w-5 fill-current" />
            </div>
            <div className="min-w-0">
              <p className="pinly-eyebrow">Saved</p>
              <h1 className="pinly-display-title">Saved memories</h1>
              <p className="pinly-body-copy">
                Revisit the posts you bookmarked for later. Saved items still follow normal visibility rules.
              </p>
            </div>
          </div>
        </section>

        <section className="pinly-screen-stack">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showLikeCounts={settings?.showLikeCounts ?? true}
              openOnBodyTap
            />
          ))}
          {posts.length === 0 ? (
            <div className="pinly-list-empty border bg-[var(--surface-strong)] text-center">
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
    </AppScreen>
  );
}
