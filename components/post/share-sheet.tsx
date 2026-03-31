"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, LoaderCircle, Search, Send, Share2, UserPlus, Users } from "lucide-react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileLink } from "@/components/profile/profile-link";
import { rankBySearch } from "@/lib/search";
import { cn } from "@/lib/utils";

type GroupOption = {
  id: string;
  name: string;
  memberCount: number;
};

type PersonOption = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  requestStatus: "friends" | "pending_sent" | "pending_received" | "none";
};

const SHARE_OPTIONS_CACHE_TTL_MS = 10_000;
let shareOptionsCache:
  | {
      groups: GroupOption[];
      friends: PersonOption[];
      expiresAt: number;
    }
  | null = null;

interface ShareSheetProps {
  postId: string;
  label?: string;
  triggerStyle?: "inline" | "emphasis";
  className?: string;
}

export function ShareSheet({
  postId,
  label = "Share",
  triggerStyle = "inline",
  className
}: ShareSheetProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [friends, setFriends] = useState<PersonOption[]>([]);
  const [searchResults, setSearchResults] = useState<PersonOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [sendingGroups, setSendingGroups] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [requestingUserId, setRequestingUserId] = useState<string | null>(null);
  const peopleSearchAbortRef = useRef<AbortController | null>(null);
  const peopleSearchTimerRef = useRef<number | null>(null);
  const drawerStyle = {
    "--pinly-sheet-height": "85vh",
    "--pinly-sheet-height-md": "75vh",
    "--pinly-sheet-top-gap": "6rem"
  } as CSSProperties;

  useEffect(() => {
    return () => {
      peopleSearchAbortRef.current?.abort();

      if (peopleSearchTimerRef.current !== null) {
        window.clearTimeout(peopleSearchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open && groups.length === 0 && friends.length === 0) {
      void loadInitialData();
    }
  }, [open, groups.length, friends.length]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedGroups(new Set());
      setSearchResults([]);
      peopleSearchAbortRef.current?.abort();
      if (peopleSearchTimerRef.current !== null) {
        window.clearTimeout(peopleSearchTimerRef.current);
        peopleSearchTimerRef.current = null;
      }
      setLoadingPeople(false);
      return;
    }

    let ignore = false;

    async function loadPeopleSearch() {
      const query = search.trim();
      if (query.length < 2) {
        setSearchResults([]);
        setLoadingPeople(false);
        return;
      }

      peopleSearchAbortRef.current?.abort();
      if (peopleSearchTimerRef.current !== null) {
        window.clearTimeout(peopleSearchTimerRef.current);
      }

      const controller = new AbortController();
      peopleSearchAbortRef.current = controller;
      setLoadingPeople(true);
      peopleSearchTimerRef.current = window.setTimeout(async () => {
        try {
          const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal
          });
          if (!response.ok) {
            throw new Error("Could not search people.");
          }

          const data = await response.json();
          if (!ignore && !controller.signal.aborted) {
            setSearchResults(data.users ?? []);
          }
        } catch {
          if (!ignore && !controller.signal.aborted) {
            toast.error("Could not search people right now.");
          }
        } finally {
          if (!ignore && !controller.signal.aborted) {
            setLoadingPeople(false);
          }
        }
      }, 220);
    }

    void loadPeopleSearch();

    return () => {
      ignore = true;
      peopleSearchAbortRef.current?.abort();
      if (peopleSearchTimerRef.current !== null) {
        window.clearTimeout(peopleSearchTimerRef.current);
        peopleSearchTimerRef.current = null;
      }
    };
  }, [open, search]);

  async function loadInitialData() {
    const now = Date.now();

    if (shareOptionsCache && shareOptionsCache.expiresAt > now) {
      setGroups(shareOptionsCache.groups);
      setFriends(shareOptionsCache.friends);
      return;
    }

    setLoadingInitial(true);
    try {
      const [groupsResponse, friendsResponse] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/friends/list")
      ]);

      if (!groupsResponse.ok || !friendsResponse.ok) {
        throw new Error("Could not load share options.");
      }

      const [groupsData, friendsData] = await Promise.all([
        groupsResponse.json(),
        friendsResponse.json()
      ]);

      const nextGroups = (groupsData.groups ?? [])
        .filter((group: any) => !group.isDirect)
        .map((group: any) => ({
          id: group.id,
          name: group.name,
          memberCount: group._count.members
        }));
      const nextFriends = (friendsData.friends ?? []).map((friend: any) => ({
        ...friend,
        requestStatus: "friends" as const
      }));

      shareOptionsCache = {
        groups: nextGroups,
        friends: nextFriends,
        expiresAt: now + SHARE_OPTIONS_CACHE_TTL_MS
      };

      setGroups(nextGroups);
      setFriends(nextFriends);
    } catch {
      toast.error("Failed to load share options.");
    } finally {
      setLoadingInitial(false);
    }
  }

  async function handleGroupShare() {
    if (selectedGroups.size === 0) {
      return;
    }

    setSendingGroups(true);

    try {
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: Array.from(selectedGroups) })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to share post");
      }

      toast.success("Post shared successfully!");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred while sharing.");
    } finally {
      setSendingGroups(false);
    }
  }

  async function handleDirectShare(person: PersonOption) {
    if (person.requestStatus !== "friends") {
      return;
    }

    setSendingUserId(person.id);

    try {
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [person.id] })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to share post");
      }

      toast.success(`Sent to ${person.name}`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send this post.");
    } finally {
      setSendingUserId(null);
    }
  }

  async function handleFriendRequest(person: PersonOption) {
    if (person.requestStatus !== "none") {
      return;
    }

    setRequestingUserId(person.id);

    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: person.username })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not send friend request.");
      }

      setSearchResults((prev) =>
        prev.map((result) =>
          result.id === person.id
            ? { ...result, requestStatus: "pending_sent" }
            : result
        )
      );
      toast.success(`Friend request sent to @${person.username}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send friend request.");
    } finally {
      setRequestingUserId(null);
    }
  }

  function toggleGroup(id: string) {
    const next = new Set(selectedGroups);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedGroups(next);
  }

  const filteredGroups = useMemo(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return groups;
    }

    return rankBySearch(
      groups,
      trimmedSearch,
      (group) => [{ value: group.name, weight: 4.4 }],
      (group) => group.memberCount
    );
  }, [groups, search]);
  const visiblePeople = useMemo(() => {
    const trimmedSearch = search.trim();

    if (trimmedSearch.length >= 2) {
      return searchResults;
    }

    if (!trimmedSearch) {
      return friends;
    }

    return rankBySearch(
      friends,
      trimmedSearch,
      (friend) => [
        { value: friend.name, weight: 3.8 },
        { value: friend.username, weight: 4.4 }
      ]
    );
  }, [friends, search, searchResults]);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          data-post-card-control
          className={cn(
            triggerStyle === "inline" &&
              "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--foreground)]/60 transition-colors hover:bg-[var(--foreground)]/5 active:scale-95",
            triggerStyle === "emphasis" &&
              "inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(255,95,162,0.22)] bg-[var(--social-accent-soft)] px-3.5 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[rgba(255,95,162,0.18)]",
            className
          )}
        >
          {triggerStyle === "emphasis" ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--social-accent)] text-white">
              <Share2 className="h-3.5 w-3.5" />
            </span>
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span>{label}</span>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
        <Drawer.Content
          className="pinly-mobile-drawer pinly-mobile-drawer--full fixed inset-x-0 z-[200] mt-24 flex flex-col rounded-t-[2.5rem] bg-[var(--surface-strong)] after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)]"
          style={drawerStyle}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--foreground)]/15" />
          <div className="pinly-sheet-body">
            <h2 className="pinly-section-title font-[var(--font-serif)]">Share memory</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/58">
              Send it to a friend directly or drop it into one of your groups.
            </p>

            <div className="relative mt-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
              <Input
                placeholder="Search people or groups..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 rounded-2xl border-none bg-[var(--surface-soft)] pl-10"
              />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pb-6">
              {loadingInitial ? (
                <div className="flex justify-center py-10">
                  <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent)]" />
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/45">
                        People
                      </h3>
                      {search.trim().length >= 2 ? (
                        <span className="text-xs text-[var(--foreground)]/45">
                          {loadingPeople ? "Searching…" : `${visiblePeople.length} result${visiblePeople.length === 1 ? "" : "s"}`}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--foreground)]/45">
                          {friends.length} friend{friends.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {visiblePeople.map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center gap-3 rounded-[1.25rem] border bg-[var(--surface-soft)] p-3"
                        >
                          <ProfileLink
                            username={person.username}
                            disableProfileNavigation
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-strong)]"
                          >
                            <Avatar name={person.name} src={person.avatarUrl} className="h-10 w-10 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{person.name}</p>
                              <p className="truncate text-xs text-[var(--foreground)]/58">@{person.username}</p>
                            </div>
                          </ProfileLink>
                          {person.requestStatus === "friends" ? (
                            <Button
                              type="button"
                              className="gap-2 rounded-full px-3"
                              disabled={sendingUserId === person.id}
                              onClick={() => void handleDirectShare(person)}
                            >
                              {sendingUserId === person.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Send
                            </Button>
                          ) : null}
                          {person.requestStatus === "none" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="gap-2 rounded-full px-3"
                              disabled={requestingUserId === person.id}
                              onClick={() => void handleFriendRequest(person)}
                            >
                              {requestingUserId === person.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                              Add friend
                            </Button>
                          ) : null}
                          {person.requestStatus === "pending_sent" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-strong)] px-3 py-2 text-xs font-medium text-[var(--foreground)]/55">
                              <Clock3 className="h-3.5 w-3.5" />
                              Requested
                            </span>
                          ) : null}
                          {person.requestStatus === "pending_received" ? (
                            <span className="inline-flex items-center rounded-full bg-[var(--surface-strong)] px-3 py-2 text-xs font-medium text-[var(--highlight)]">
                              Respond in Friends
                            </span>
                          ) : null}
                        </div>
                      ))}
                      {!loadingPeople && visiblePeople.length === 0 ? (
                        <p className="rounded-2xl border border-dashed bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--foreground)]/55">
                          {search.trim().length >= 2
                            ? "No people matched that search."
                            : "Your friends will show up here for one-tap sharing."}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/45">
                        Groups
                      </h3>
                      <span className="text-xs text-[var(--foreground)]/45">
                        {selectedGroups.size} selected
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {filteredGroups.map((group) => {
                        const isSelected = selectedGroups.has(group.id);
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className={cn(
                              "flex w-full items-center gap-4 rounded-[1.25rem] border p-3 text-left transition-colors",
                              isSelected
                                ? "border-[var(--social-accent)] bg-[var(--social-accent-soft)]"
                                : "border-transparent bg-[var(--surface-soft)] hover:bg-[var(--foreground)]/5"
                            )}
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
                              <Users className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{group.name}</p>
                              <p className="text-xs text-[var(--foreground)]/60">
                                {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="shrink-0 px-2 text-[var(--social-accent)]">
                              {isSelected ? <CheckCircle2 className="h-6 w-6" /> : null}
                            </div>
                          </button>
                        );
                      })}
                      {filteredGroups.length === 0 ? (
                        <p className="rounded-2xl border border-dashed bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--foreground)]/55">
                          No groups matched that search.
                        </p>
                      ) : null}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="mt-auto border-t pt-4">
              <Button
                onClick={() => void handleGroupShare()}
                disabled={selectedGroups.size === 0 || sendingGroups}
                className="w-full rounded-2xl text-[15px] font-semibold"
              >
                {sendingGroups ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  `Send to ${selectedGroups.size} group${selectedGroups.size === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
