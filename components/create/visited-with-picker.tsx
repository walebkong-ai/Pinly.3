"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Search, Users } from "lucide-react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rankBySearch } from "@/lib/search";
import { cn } from "@/lib/utils";

export type VisitedWithFriend = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

function mergeFriends(
  existingFriends: VisitedWithFriend[],
  nextFriends: VisitedWithFriend[]
) {
  return Array.from(
    new Map(
      [...existingFriends, ...nextFriends].map((friend) => [friend.id, friend])
    ).values()
  );
}

export function VisitedWithPicker({
  selectedFriendIds,
  onChange,
  initialSelectedFriends = []
}: {
  selectedFriendIds: string[];
  onChange: (friendIds: string[]) => void;
  initialSelectedFriends?: VisitedWithFriend[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<VisitedWithFriend[]>(() => initialSelectedFriends);
  const [hasLoadedFriends, setHasLoadedFriends] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (initialSelectedFriends.length === 0) {
      return;
    }

    setFriends((currentFriends) => mergeFriends(currentFriends, initialSelectedFriends));
  }, [initialSelectedFriends]);

  useEffect(() => {
    if (!open || hasLoadedFriends) {
      return;
    }

    let ignore = false;

    async function loadFriends() {
      setLoading(true);

      try {
        const response = await fetch("/api/friends/list");
        if (!response.ok) {
          throw new Error("Could not load friends.");
        }

        const data = await response.json();
        if (!ignore) {
          setFriends((currentFriends) => mergeFriends(currentFriends, data.friends ?? []));
          setHasLoadedFriends(true);
        }
      } catch {
        if (!ignore) {
          toast.error("Could not load friends to tag right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadFriends();

    return () => {
      ignore = true;
    };
  }, [open, hasLoadedFriends]);

  const selectedSet = useMemo(() => new Set(selectedFriendIds), [selectedFriendIds]);
  const selectedFriends = useMemo(
    () => friends.filter((friend) => selectedSet.has(friend.id)),
    [friends, selectedSet]
  );
  const visibleFriends = useMemo(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return friends;
    }

    return rankBySearch(
      friends,
      trimmedQuery,
      (friend) => [
        { value: friend.name, weight: 3.8 },
        { value: friend.username, weight: 4.4 }
      ]
    );
  }, [friends, query]);
  const drawerStyle = {
    "--pinly-sheet-height": "78vh",
    "--pinly-sheet-height-md": "68vh",
    "--pinly-sheet-top-gap": "6rem"
  } as CSSProperties;

  function toggleFriend(friendId: string) {
    const next = new Set(selectedSet);
    if (next.has(friendId)) {
      next.delete(friendId);
    } else {
      next.add(friendId);
    }
    onChange(Array.from(next));
  }

  return (
    <div className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Users className="h-4 w-4 text-[var(--social-accent)]" />
            Visited with
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]/62">
            Tag friends who were there with you. Optional, and only your accepted friends can be added.
          </p>
        </div>
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Trigger asChild>
            <Button type="button" variant="secondary" className="shrink-0 rounded-full px-4">
              {selectedFriendIds.length > 0 ? "Edit" : "Add friends"}
            </Button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
            <Drawer.Content
              className="pinly-mobile-drawer pinly-mobile-drawer--full fixed inset-x-0 z-[200] mt-24 flex flex-col rounded-t-[2.5rem] bg-[var(--surface-strong)] after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]"
              style={drawerStyle}
            >
              <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--foreground)]/15" />
              <div className="flex flex-1 flex-col overflow-hidden p-6">
                <Drawer.Title className="font-[var(--font-serif)] text-2xl font-semibold">
                  Tag friends
                </Drawer.Title>
                <Drawer.Description className="mt-1 text-sm text-[var(--foreground)]/58">
                  Choose which friends were with you for this memory.
                </Drawer.Description>

                <div className="relative mt-4">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
                  <Input
                    placeholder="Search friends..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-12 rounded-2xl border-none bg-[var(--surface-soft)] pl-10"
                  />
                </div>

                <div className="mt-4 flex-1 overflow-y-auto pb-4">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent)]" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleFriends.map((friend) => {
                        const isSelected = selectedSet.has(friend.id);

                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => toggleFriend(friend.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                              isSelected
                                ? "border-[var(--social-accent)] bg-[var(--social-accent-soft)]"
                                : "border-transparent bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)]"
                            )}
                          >
                            <Avatar name={friend.name} src={friend.avatarUrl} className="h-10 w-10 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{friend.name}</p>
                              <p className="truncate text-xs text-[var(--foreground)]/58">@{friend.username}</p>
                            </div>
                            <div className="shrink-0 text-[var(--social-accent)]">
                              {isSelected ? <CheckCircle2 className="h-5 w-5" /> : null}
                            </div>
                          </button>
                        );
                      })}
                      {visibleFriends.length === 0 ? (
                        <p className="rounded-2xl border border-dashed bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--foreground)]/55">
                          {friends.length === 0
                            ? "Add friends first to tag who visited with you."
                            : "No friends matched that search."}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                <Button type="button" className="h-12 rounded-2xl" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {selectedFriends.length > 0 ? (
          selectedFriends.map((friend) => (
            <span
              key={friend.id}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,95,162,0.2)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            >
              <Avatar name={friend.name} src={friend.avatarUrl} className="h-6 w-6" />
              <span>{friend.name}</span>
            </span>
          ))
        ) : (
          <p className="text-sm text-[var(--foreground)]/52">No friends tagged for this memory.</p>
        )}
      </div>
    </div>
  );
}
