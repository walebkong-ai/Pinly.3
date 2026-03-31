"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FolderPlus, Folders, LoaderCircle, Search } from "lucide-react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { CollectionVisibilitySelector } from "@/components/collections/collection-visibility-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CollectionChip, CollectionVisibility } from "@/types/app";

type CollectionOption = CollectionChip & {
  postCount: number;
  visibility: CollectionVisibility;
};

function mergeCollectionOptions(current: CollectionOption[], incoming: CollectionOption[]) {
  return Array.from(new Map([...current, ...incoming].map((collection) => [collection.id, collection])).values()).sort(
    (left, right) => right.postCount - left.postCount || left.name.localeCompare(right.name)
  );
}

async function loadCollectionOptions() {
  const response = await fetch("/api/collections");

  if (!response.ok) {
    throw new Error("Could not load collections.");
  }

  const data = await response.json();
  return (data.collections ?? []).map((c: any) => ({
    ...c,
    visibility: c.visibility || "private"
  })) as CollectionOption[];
}

async function createCollection(name: string, visibility: CollectionVisibility, color?: string | null) {
  const response = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, visibility, color: color ?? null })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Could not create collection.");
  }

  const data = await response.json();
  return data.collection as CollectionOption;
}

function CollectionSelectionPanel({
  collections,
  selectedIds,
  onToggle,
  query,
  onQueryChange,
  newCollectionName,
  onNewCollectionNameChange,
  newCollectionVisibility,
  onNewCollectionVisibilityChange,
  onCreateCollection,
  creating,
  loading,
  footer
}: {
  collections: CollectionOption[];
  selectedIds: Set<string>;
  onToggle: (collectionId: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  newCollectionName: string;
  onNewCollectionNameChange: (value: string) => void;
  newCollectionVisibility: CollectionVisibility;
  onNewCollectionVisibilityChange: (value: CollectionVisibility) => void;
  onCreateCollection: () => void;
  creating: boolean;
  loading: boolean;
  footer: ReactNode;
}) {
  const visibleCollections = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return collections;
    }

    return collections.filter((collection) => collection.name.toLowerCase().includes(trimmedQuery));
  }, [collections, query]);

  return (
    <div className="pinly-sheet-body">
      <h3 className="pinly-section-title font-[var(--font-serif)]">Trips & collections</h3>
      <p className="mt-1 text-sm text-[var(--foreground)]/58">
        Group related memories together so they are easy to revisit later.
      </p>

      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
        <Input
          placeholder="Search collections..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-12 rounded-2xl border-none bg-[var(--surface-soft)] pl-10"
        />
      </div>

      <div className="mt-4 rounded-[1.5rem] border bg-[var(--surface-soft)] p-3">
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--foreground)]/45">
          New collection
        </label>
        <div className="mt-2 flex items-center gap-2">
          <Input
            placeholder="Montreal trip"
            value={newCollectionName}
            onChange={(event) => onNewCollectionNameChange(event.target.value)}
            className="h-11 rounded-2xl border-none bg-[var(--surface-strong)]"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-11 shrink-0 rounded-2xl px-4"
            onClick={onCreateCollection}
            disabled={creating || newCollectionName.trim().length < 2}
          >
            {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]/40 px-1">
            Privacy
          </p>
          <CollectionVisibilitySelector
            value={newCollectionVisibility}
            onChange={onNewCollectionVisibilityChange}
            disabled={creating}
          />
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="space-y-2">
            {visibleCollections.map((collection) => {
              const isSelected = selectedIds.has(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => onToggle(collection.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                    isSelected
                      ? "border-[var(--map-accent)] bg-[rgba(56,182,201,0.12)]"
                      : "border-transparent bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)]"
                  )}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={{
                      backgroundColor: collection.color ?? "rgba(56,182,201,0.15)"
                    }}
                  >
                    <Folders className="h-4 w-4" style={{ color: collection.color ? "white" : "var(--map-accent)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{collection.name}</p>
                    <p className="truncate text-xs text-[var(--foreground)]/58">
                      {collection.postCount} {collection.postCount === 1 ? "post" : "posts"}
                    </p>
                  </div>
                  {isSelected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--map-accent)]" /> : null}
                </button>
              );
            })}
            {visibleCollections.length === 0 ? (
              <p className="rounded-2xl border border-dashed bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--foreground)]/55">
                {collections.length === 0
                  ? "Create your first trip or collection to start organizing memories."
                  : "No collections matched that search."}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}

export function CollectionPicker({
  selectedCollectionIds,
  onChange
}: {
  selectedCollectionIds: string[];
  onChange: (collectionIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [query, setQuery] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionVisibility, setNewCollectionVisibility] = useState<CollectionVisibility>("private");
  const [creating, startCreateTransition] = useTransition();
  const drawerStyle = {
    "--pinly-sheet-top-gap": "6rem"
  } as CSSProperties;

  useEffect(() => {
    if (!open || collections.length > 0) {
      return;
    }

    let ignore = false;
    setLoading(true);

    void loadCollectionOptions()
      .then((items) => {
        if (!ignore) {
          setCollections(items);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Could not load collections right now.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [open, collections.length]);

  const selectedIds = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);
  const selectedCollections = useMemo(
    () => collections.filter((collection) => selectedIds.has(collection.id)),
    [collections, selectedIds]
  );

  function toggleCollection(collectionId: string) {
    const next = new Set(selectedIds);
    if (next.has(collectionId)) {
      next.delete(collectionId);
    } else {
      next.add(collectionId);
    }
    onChange(Array.from(next));
  }

  function handleCreateCollection() {
    const trimmedName = newCollectionName.trim();
    if (trimmedName.length < 2) {
      return;
    }

    startCreateTransition(async () => {
      try {
        const collection = await createCollection(trimmedName, newCollectionVisibility);
        setCollections((current) => mergeCollectionOptions(current, [collection]));
        onChange(Array.from(new Set([...selectedCollectionIds, collection.id])));
        setNewCollectionName("");
        setNewCollectionVisibility("private");
        toast.success(`Saved to ${collection.name}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create collection.");
      }
    });
  }

  return (
    <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Folders className="h-4 w-4 text-[var(--map-accent)]" />
            Trips & collections
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]/62">
            Add this memory to one or more folders like a trip, season, or weekend.
          </p>
        </div>
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Trigger asChild>
            <Button type="button" variant="secondary" className="shrink-0 rounded-full px-4">
              {selectedCollectionIds.length > 0 ? "Edit" : "Add folders"}
            </Button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
            <Drawer.Content
              className="pinly-mobile-drawer pinly-mobile-drawer--full fixed inset-x-0 z-[200] mt-24 flex flex-col rounded-t-[2.5rem] bg-[var(--surface-strong)] after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]"
              style={drawerStyle}
            >
              <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--foreground)]/15" />
              <CollectionSelectionPanel
                collections={collections}
                selectedIds={selectedIds}
                onToggle={toggleCollection}
                query={query}
                onQueryChange={setQuery}
                newCollectionName={newCollectionName}
                onNewCollectionNameChange={setNewCollectionName}
                newCollectionVisibility={newCollectionVisibility}
                onNewCollectionVisibilityChange={setNewCollectionVisibility}
                onCreateCollection={handleCreateCollection}
                creating={creating}
                loading={loading}
                footer={
                  <Button type="button" className="rounded-2xl" onClick={() => setOpen(false)}>
                    Done
                  </Button>
                }
              />
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {selectedCollections.length > 0 ? (
          selectedCollections.map((collection) => (
            <span
              key={collection.id}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,182,201,0.2)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            >
              <Folders className="h-3.5 w-3.5 text-[var(--map-accent)]" />
              <span>{collection.name}</span>
            </span>
          ))
        ) : (
          <p className="text-sm text-[var(--foreground)]/52">No trip folders selected for this memory.</p>
        )}
      </div>
    </div>
  );
}

export function ManagePostCollectionsCard({
  postId,
  initialCollections
}: {
  postId: string;
  initialCollections: CollectionChip[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>(
    initialCollections.map((collection) => ({
      ...collection,
      postCount: 0,
      visibility: "private" // Fallback, will be updated by loadCollectionOptions
    }))
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    initialCollections.map((collection) => collection.id)
  );
  const [currentCollections, setCurrentCollections] = useState<CollectionChip[]>(initialCollections);
  const [query, setQuery] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionVisibility, setNewCollectionVisibility] = useState<CollectionVisibility>("private");
  const [creating, startCreateTransition] = useTransition();
  const [saving, startSaveTransition] = useTransition();
  const drawerStyle = {
    "--pinly-sheet-height": "80vh",
    "--pinly-sheet-height-md": "70vh",
    "--pinly-sheet-top-gap": "6rem"
  } as CSSProperties;

  useEffect(() => {
    setSelectedCollectionIds(initialCollections.map((collection) => collection.id));
    setCurrentCollections(initialCollections);
    setCollections((current) =>
      mergeCollectionOptions(
        current,
        initialCollections.map((collection) => ({
          ...collection,
          postCount: 0,
          visibility: "private"
        }))
      )
    );
  }, [initialCollections]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let ignore = false;
    setLoading(true);

    void loadCollectionOptions()
      .then((items) => {
        if (!ignore) {
          setCollections((current) => mergeCollectionOptions(current, items));
        }
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Could not load collections right now.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [open]);

  const selectedIds = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);

  function toggleCollection(collectionId: string) {
    setSelectedCollectionIds((current) => {
      const next = new Set(current);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return Array.from(next);
    });
  }

  function handleCreateCollection() {
    const trimmedName = newCollectionName.trim();
    if (trimmedName.length < 2) {
      return;
    }

    startCreateTransition(async () => {
      try {
        const collection = await createCollection(trimmedName, newCollectionVisibility);
        setCollections((current) => mergeCollectionOptions(current, [collection]));
        setSelectedCollectionIds((current) => Array.from(new Set([...current, collection.id])));
        setNewCollectionName("");
        setNewCollectionVisibility("private");
        toast.success(`Created ${collection.name}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create collection.");
      }
    });
  }

  function handleSave() {
    startSaveTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/collections`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionIds: selectedCollectionIds })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Could not update collections.");
        }

        const data = await response.json();
        const nextCollections = (data.collections ?? []) as CollectionChip[];
        setCurrentCollections(nextCollections);
        setSelectedCollectionIds(nextCollections.map((collection) => collection.id));
        setOpen(false);
        router.refresh();
        toast.success("Collections updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update collections.");
      }
    });
  }

  return (
    <div className="rounded-[1.5rem] border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.06)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Folders className="h-4 w-4 text-[var(--map-accent)]" />
            Trips & collections
          </div>
          <p className="mt-1 text-sm text-[var(--foreground)]/62">
            Keep this memory grouped with a trip, season, or weekend folder.
          </p>
        </div>
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Trigger asChild>
            <Button type="button" variant="secondary" className="shrink-0 rounded-full px-4">
              {currentCollections.length > 0 ? "Manage" : "Add"}
            </Button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
            <Drawer.Content
              className="pinly-mobile-drawer pinly-mobile-drawer--full fixed inset-x-0 z-[200] mt-24 flex flex-col rounded-t-[2.5rem] bg-[var(--surface-strong)] after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]"
              style={drawerStyle}
            >
              <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--foreground)]/15" />
              <CollectionSelectionPanel
                collections={collections}
                selectedIds={selectedIds}
                onToggle={toggleCollection}
                query={query}
                onQueryChange={setQuery}
                newCollectionName={newCollectionName}
                onNewCollectionNameChange={setNewCollectionName}
                newCollectionVisibility={newCollectionVisibility}
                onNewCollectionVisibilityChange={setNewCollectionVisibility}
                onCreateCollection={handleCreateCollection}
                creating={creating}
                loading={loading}
                footer={
                  <Button
                    type="button"
                    className="rounded-2xl"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save collections"}
                  </Button>
                }
              />
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {currentCollections.length > 0 ? (
          currentCollections.map((collection) => (
            <span
              key={collection.id}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,182,201,0.2)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            >
              <Folders className="h-3.5 w-3.5 text-[var(--map-accent)]" />
              <span>{collection.name}</span>
            </span>
          ))
        ) : (
          <p className="text-sm text-[var(--foreground)]/52">This memory is not in a collection yet.</p>
        )}
      </div>
    </div>
  );
}
