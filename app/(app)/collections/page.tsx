import Link from "next/link";
import { FolderOpen, Folders } from "lucide-react";
import { redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { auth } from "@/lib/auth";
import { getOwnedCollections } from "@/lib/data";
import { CollectionCard } from "@/components/collections/collection-card";
import { CreateCollectionButton } from "@/components/collections/create-collection-button";

export default async function CollectionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const collections = await getOwnedCollections(session.user.id, 32);

  return (
    <AppScreen>
      <div className="pinly-content-shell pinly-screen-stack animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <section className="glass-panel pinly-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(56,182,201,0.12)] text-[var(--map-accent)]">
                <Folders className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="pinly-eyebrow">Collections</p>
                <h1 className="pinly-display-title">Trip folders</h1>
                <p className="pinly-body-copy">
                  Keep related memories together by trip, season, or weekend.
                </p>
              </div>
            </div>
            <CreateCollectionButton label="New" className="px-4" />
          </div>
        </section>

        {collections.length > 0 ? (
          <section className="grid gap-[var(--pinly-page-gap)] sm:grid-cols-2">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </section>
        ) : (
          <section className="pinly-list-empty border bg-[var(--surface-strong)] text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--map-accent)]">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No collections yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/58">
              Create a folder first, then add memories from the create flow or your full post view.
            </p>
            <div className="mt-4 flex flex-col items-center gap-3">
              <CreateCollectionButton label="Create your first collection" />
              <Link
                href="/create"
                className="text-sm font-medium text-[var(--foreground)]/64 transition hover:text-[var(--foreground)]"
              >
                Add a new memory
              </Link>
            </div>
          </section>
        )}
      </div>
    </AppScreen>
  );
}
