import Link from "next/link";
import { FolderOpen, Folders } from "lucide-react";
import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[1.75rem] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(56,182,201,0.12)] text-[var(--map-accent)]">
              <Folders className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Collections</p>
              <h1 className="mt-1.5 font-[var(--font-serif)] text-2xl md:text-3xl">Trip folders</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/66">
                Keep related memories together by trip, season, or weekend.
              </p>
            </div>
          </div>
          <CreateCollectionButton label="New" className="px-4" />
        </div>
      </section>

      {collections.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </section>
      ) : (
        <section className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center">
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
  );
}
