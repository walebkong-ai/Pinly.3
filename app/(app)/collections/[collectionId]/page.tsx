import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { auth } from "@/lib/auth";
import { getVisibleCollectionById } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/post/post-card";
import { CollectionDetailShell } from "@/components/collections/collection-detail-shell";

type Props = {
  params: Promise<{ collectionId: string }>;
};

export default async function CollectionDetailPage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { collectionId } = await params;
  const [collectionData, settings] = await Promise.all([
    getVisibleCollectionById(session.user.id, collectionId),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { showLikeCounts: true }
    })
  ]);

  if (!collectionData) {
    notFound();
  }

  const { collection, posts } = collectionData;
  const color = collection.color ?? null;

  return (
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 rounded-2xl px-2 py-1 text-sm font-medium text-[var(--foreground)]/62 transition hover:bg-black/5 hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to collections
        </Link>

        <section className="glass-panel rounded-[1.75rem] p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm"
              style={{
                backgroundColor: color ? `${color}22` : "rgba(56,182,201,0.12)",
                color: color ?? "var(--map-accent)"
              }}
            >
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Collection</p>
              <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">{collection.name}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
                {collection.postCount} {collection.postCount === 1 ? "memory" : "memories"} grouped together here.
              </p>
            </div>
          </div>

          <CollectionDetailShell
            collectionId={collection.id}
            color={color}
            visibility={collection.visibility}
            hasPosts={posts.length > 0}
          />
        </section>

        {posts.length > 0 ? (
          <section className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                showLikeCounts={settings?.showLikeCounts ?? true}
                openOnBodyTap
              />
            ))}
          </section>
        ) : (
          <section className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--map-accent)]">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No memories here yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/58">
              Add posts from your full post view to start filling this collection.
            </p>
          </section>
        )}
      </div>
    </AppScreen>
  );
}
