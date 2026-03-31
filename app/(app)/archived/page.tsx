import Link from "next/link";
import { Archive, ArchiveRestore } from "lucide-react";
import { redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { auth } from "@/lib/auth";
import { getOwnedArchivedPosts } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/post/back-button";
import { PostCard } from "@/components/post/post-card";
import { ArchivePostButton } from "@/components/post/archive-post-button";

export default async function ArchivedPostsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [posts, settings, user] = await Promise.all([
    getOwnedArchivedPosts(session.user.id, 48),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { showLikeCounts: true }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true }
    })
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <BackButton fallbackHref={`/profile/${user.username}`} label="Profile" />

        <section className="glass-panel pinly-panel">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--foreground)]">
              <Archive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="pinly-eyebrow">Archived</p>
              <h1 className="pinly-display-title">Hidden memories</h1>
              <p className="pinly-body-copy">
                Archived posts stay out of your feed, map, and normal profile until you restore them.
              </p>
            </div>
          </div>
        </section>

        {posts.length > 0 ? (
          <section className="pinly-screen-stack">
            {posts.map((post) => (
              <div key={post.id} className="space-y-2">
                <PostCard
                  post={post}
                  showLikeCounts={settings?.showLikeCounts ?? true}
                  openOnBodyTap
                />
                <div className="rounded-[var(--pinly-panel-radius)] border bg-[var(--surface-soft)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[var(--foreground)]/62">
                      This memory is hidden from normal browsing surfaces until you restore it.
                    </p>
                    <ArchivePostButton
                      postId={post.id}
                      initialArchived
                      compact
                      className="w-full sm:w-auto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="pinly-list-empty border bg-[var(--surface-strong)] text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(56,182,201,0.12)] text-[var(--map-accent)]">
              <ArchiveRestore className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No archived memories</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/58">
              Archived posts will show up here so you can restore them any time.
            </p>
            <Link
              href="/profile/me"
              className="mt-4 inline-flex rounded-full bg-[var(--map-accent)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:opacity-95"
            >
              Back to profile
            </Link>
          </section>
        )}
      </div>
    </AppScreen>
  );
}
