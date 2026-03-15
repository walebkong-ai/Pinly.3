"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { LoaderCircle, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageFriendButton } from "@/components/messages/message-friend-button";
import { rankBySearch } from "@/lib/search";

type Friend = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export function StartDirectMessageSheet() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || friends.length > 0) {
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
          setFriends(data.friends ?? []);
        }
      } catch {
        if (!ignore) {
          toast.error("Could not load friends right now.");
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
  }, [open, friends.length]);

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

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button type="button" variant="secondary" className="h-11 rounded-full px-4">
          <MessageCircle className="mr-2 h-4 w-4" />
          Message friend
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[200] mt-24 flex h-[80vh] flex-col rounded-t-[2.5rem] bg-[var(--surface-strong)] pb-safe after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)] md:h-[70vh]">
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--foreground)]/15" />
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            <h2 className="font-[var(--font-serif)] text-2xl font-semibold">Start a direct chat</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/58">
              Pick a friend to open your one-to-one conversation.
            </p>

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
                  {visibleFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-soft)] p-3"
                    >
                      <Avatar name={friend.name} src={friend.avatarUrl} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{friend.name}</p>
                        <p className="truncate text-xs text-[var(--foreground)]/58">@{friend.username}</p>
                      </div>
                      <MessageFriendButton
                        friendId={friend.id}
                        label="Open"
                        variant="secondary"
                        className="h-9 shrink-0 px-3"
                        onConversationOpened={() => setOpen(false)}
                      />
                    </div>
                  ))}
                  {visibleFriends.length === 0 ? (
                    <p className="rounded-2xl border border-dashed bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--foreground)]/55">
                      {friends.length === 0
                        ? "Add friends to start direct conversations."
                        : "No friends matched that search."}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
