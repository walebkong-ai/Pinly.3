"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { StartDirectMessageSheet } from "@/components/messages/start-direct-message-sheet";
import { ProfileLink } from "@/components/profile/profile-link";
import { Input } from "@/components/ui/input";
import type { MessageGroupSummary } from "@/lib/data";
import { rankBySearch } from "@/lib/search";

export function GroupsList({ initialGroups }: { initialGroups?: MessageGroupSummary[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState<MessageGroupSummary[]>(initialGroups ?? []);
  const [loading, setLoading] = useState(initialGroups === undefined);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (initialGroups !== undefined) {
      setGroups(initialGroups);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const response = await fetch("/api/groups");
        if (response.ok) {
          const data = await response.json();
          setGroups(data.groups);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [initialGroups]);

  const visibleGroups = useMemo(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return groups;
    }

    return rankBySearch(
      groups,
      trimmedQuery,
      (group) => [
        { value: group.isDirect ? group.directUser?.name : group.name, weight: 4.6 },
        { value: group.directUser?.username, weight: 4.1 },
        { value: group.name, weight: 3.8 },
        { value: group.lastMessage?.content, weight: 1.6 }
      ],
      (group) => new Date(group.lastMessage?.createdAt ?? group.updatedAt).getTime()
    );
  }, [groups, query]);

  function openConversation(groupId: string) {
    router.push(`/messages/${groupId}`);
  }

  function handleConversationKeyDown(event: KeyboardEvent<HTMLDivElement>, groupId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openConversation(groupId);
    }
  }

  return (
    <div className="pinly-content-shell pinly-screen-grid animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel pinly-panel w-full min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="pinly-eyebrow">Messages</p>
            <h1 className="pinly-display-title">Your inbox</h1>
            <p className="pinly-body-copy max-w-lg">
              Keep group trip chats and one-to-one friend conversations together in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <StartDirectMessageSheet />
            <Link
              href="/messages/create"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              New Group
            </Link>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations, people, or message text"
            className="h-12 rounded-2xl bg-[var(--surface-soft)] pl-11"
          />
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-[var(--foreground)]/60">Loading conversations...</div>
          ) : groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-[var(--surface-soft)] p-6 text-sm text-[var(--foreground)]/60">
              No conversations yet. Start a group here or open a friend chat from the Friends section.
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-[var(--surface-soft)] p-6 text-sm text-[var(--foreground)]/60">
              No conversations matched that search.
            </div>
          ) : (
            visibleGroups.map((group) => (
              <div
                key={group.id}
                role="link"
                tabIndex={0}
                onClick={() => openConversation(group.id)}
                onKeyDown={(event) => handleConversationKeyDown(event, group.id)}
                className={`flex cursor-pointer items-start justify-between gap-3 rounded-[1.5rem] border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/40 hover:bg-[var(--surface-strong)] ${
                  group.hasUnread
                    ? "border-[rgba(56,182,201,0.22)] bg-[rgba(56,182,201,0.1)]"
                    : "bg-[var(--surface-soft)]"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  {group.isDirect && group.directUser ? (
                    <ProfileLink username={group.directUser.username} disableProfileNavigation>
                      <Avatar
                        name={group.directUser.name}
                        src={group.directUser.avatarUrl}
                        className="h-12 w-12 shrink-0 border border-white/70"
                      />
                    </ProfileLink>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                      <Users className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {group.isDirect && group.directUser ? (
                        <ProfileLink
                          username={group.directUser.username}
                          disableProfileNavigation
                          className="min-w-0 rounded-xl px-1 py-1 -ml-1 transition hover:bg-[var(--surface-strong)]"
                        >
                        <h3 className="truncate text-[1.02rem] font-semibold">{group.directUser.name}</h3>
                      </ProfileLink>
                    ) : (
                        <h3 className="truncate text-[1.02rem] font-semibold">{group.name}</h3>
                    )}
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                          group.isDirect
                            ? "bg-[var(--map-accent-soft)] text-[var(--map-accent)]"
                            : "bg-[var(--surface-strong)] text-[var(--foreground)]/65"
                        }`}
                      >
                        {group.isDirect ? "Direct" : "Group"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--foreground)]/60">
                      {group.isDirect && group.directUser ? (
                        <ProfileLink
                          username={group.directUser.username}
                          disableProfileNavigation
                          className="rounded-md px-0.5 -ml-0.5 transition hover:text-[var(--foreground)]"
                        >
                          <span>@{group.directUser.username}</span>
                        </ProfileLink>
                      ) : (
                        `${group._count.members} members`
                      )}
                    </p>
                    <p className={`mt-1 line-clamp-2 text-sm ${group.hasUnread ? "font-medium text-[var(--foreground)]" : "text-[var(--foreground)]/72"}`}>
                      {group.lastMessage
                        ? `${group.lastMessage.senderName}: ${group.lastMessage.content}`
                        : group.isDirect
                          ? "Start your conversation."
                          : "No messages yet. Start the trip chat."}
                    </p>
                  </div>
                </div>
                <div className="flex w-[4.75rem] shrink-0 flex-col items-end gap-2 pt-0.5 text-right sm:w-[5.25rem]">
                  <span className={`max-w-full truncate text-xs ${group.hasUnread ? "font-medium text-[var(--map-accent)]" : "text-[var(--foreground)]/45"}`}>
                    {formatDistanceToNow(new Date(group.lastMessage?.createdAt ?? group.updatedAt), { addSuffix: true })}
                  </span>
                  <span className="inline-flex max-w-full items-center justify-end gap-1 text-xs text-[var(--foreground)]/55">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {group._count.messages}
                  </span>
                  {group.hasUnread ? (
                    <span className="inline-flex items-center rounded-full bg-[var(--map-accent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      New
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
