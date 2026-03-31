"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock3, LoaderCircle, Search, UserPlus, X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageFriendButton } from "@/components/messages/message-friend-button";
import { ProfileLink } from "@/components/profile/profile-link";

type SearchResult = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  requestStatus: "friends" | "pending_sent" | "pending_received" | "none";
};

type FriendState = {
  friends: Array<{ id: string; name: string; username: string; avatarUrl: string | null }>;
  incomingRequests: Array<{
    id: string;
    fromUser: { id: string; name: string; username: string; avatarUrl: string | null };
  }>;
  outgoingRequests: Array<{
    id: string;
    toUser: { id: string; name: string; username: string; avatarUrl: string | null };
  }>;
};

export function FriendsManager() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [copyingInvite, setCopyingInvite] = useState(false);
  const [state, setState] = useState<FriendState>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: []
  });

  async function refresh() {
    const response = await fetch("/api/friends/list");
    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      toast.error("Could not load your friends right now.");
      return;
    }

    setState(data);
  }

  function updateSearchResultStatus(
    username: string,
    requestStatus: SearchResult["requestStatus"]
  ) {
    setSearchResults((current) =>
      current.map((result) =>
        result.username === username
          ? {
              ...result,
              requestStatus
            }
          : result
      )
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    let ignore = false;

    async function search() {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);

      try {
        const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
          signal: abortController.signal
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Could not search friends.");
        }

        if (!ignore) {
          setSearchResults(data?.users ?? []);
        }
      } catch (error) {
        if (!ignore && !(error instanceof DOMException && error.name === "AbortError")) {
          toast.error("Could not search friends right now.");
        }
      } finally {
        if (!ignore) {
          setSearching(false);
        }
      }
    }

    void search();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [query]);

  async function sendRequest(username: string) {
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(data?.error ?? "Could not send friend request.");
      return;
    }

    toast.success(data?.autoAccepted ? "You are now friends." : "Friend request sent.");
    setQuery("");
    await refresh();
  }

  async function respond(requestId: string, action: "accept" | "decline", username?: string) {
    const response = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action })
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Could not update request.");
      return;
    }

    toast.success(action === "accept" ? "Friend added." : "Request declined.");
    if (username) {
      updateSearchResultStatus(username, action === "accept" ? "friends" : "none");
    }
    await refresh();
  }

  async function clearRelationship(username: string, label: "request" | "friend") {
    const response = await fetch(`/api/friends/${username}/remove`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(data?.error ?? "Could not update this relationship.");
      return;
    }

    toast.success(label === "friend" ? "Friend removed." : "Request canceled.");
    updateSearchResultStatus(username, "none");
    await refresh();
  }

  async function handleInviteLink() {
    if (copyingInvite) {
      return;
    }

    setCopyingInvite(true);

    try {
      const res = await fetch("/api/invites", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed");
      }

      const data = await res.json();
      const url = window.location.origin + data.link;

      if (navigator.share) {
        await navigator.share({ url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link copied!");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        toast.success("Invite link copied!");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Failed to generate link.");
      }
    } finally {
      setCopyingInvite(false);
    }
  }

  return (
    <div className="pinly-content-shell pinly-screen-grid--split animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel pinly-panel w-full min-w-0">
        <p className="pinly-eyebrow">Grow your circle</p>
        <h1 className="pinly-display-title">Friends & requests</h1>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or username"
            className="pl-11"
          />
        </div>
        {!state.friends.length && !state.incomingRequests.length && !state.outgoingRequests.length && query.trim().length < 2 ? (
          <div className="mt-4 rounded-[var(--pinly-panel-radius)] border bg-[var(--surface-soft)] p-4">
            <p className="pinly-eyebrow">First friends</p>
            <h2 className="mt-1.5 text-lg font-semibold">Start with the people you actually travel with.</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/62">
              Once a friend accepts, you can see each other&apos;s memories on the map, share posts, and message directly.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border bg-[var(--surface-strong)] px-3 py-1 text-xs text-[var(--foreground)]/62">
                1. Search by username above
              </span>
              <span className="rounded-full border bg-[var(--surface-strong)] px-3 py-1 text-xs text-[var(--foreground)]/62">
                2. Or copy an invite link below
              </span>
            </div>
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          {searching ? (
            <div className="flex justify-center py-3">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent)]" />
            </div>
          ) : null}
          {searchResults.map((user) => (
            <div key={user.id} className="flex w-full min-w-0 items-center justify-between rounded-[1.35rem] border bg-[var(--surface-soft)] p-3">
              <ProfileLink
                username={user.username}
                className="mr-3 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-strong)]"
              >
                <Avatar name={user.name} src={user.avatarUrl} className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-sm text-[var(--foreground)]/58">@{user.username}</p>
                </div>
              </ProfileLink>
              <div className="shrink-0">
                {user.requestStatus === "none" && (
                  <Button className="gap-2" onClick={() => sendRequest(user.username)}>
                    <UserPlus className="h-4 w-4" />
                    Add
                  </Button>
                )}
                {user.requestStatus === "friends" && <span className="text-sm font-medium text-[var(--accent)]">Friends</span>}
                {user.requestStatus === "pending_sent" && (
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-full px-3 text-sm text-[var(--foreground)]/60"
                    onClick={() => void clearRelationship(user.username, "request")}
                  >
                    <Clock3 className="h-4 w-4" />
                    Pending
                  </Button>
                )}
                {user.requestStatus === "pending_received" && (
                  <span className="text-sm font-medium text-[var(--highlight)] flex-shrink-0">Respond below</span>
                )}
              </div>
            </div>
          ))}
          {!searching && !searchResults.length && query.length >= 2 && (
            <div className="rounded-3xl border border-dashed bg-[var(--surface-soft)] p-6 text-sm text-[var(--foreground)]/60">
              No matching usernames found.
            </div>
          )}
        </div>
      </section>

      <div className="pinly-screen-stack">
        <section className="glass-panel pinly-panel flex w-full min-w-0 items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--foreground)]/45">Invite Friends</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/80">Can&apos;t find them? Send a link.</p>
          </div>
          <Button variant="secondary" onClick={() => void handleInviteLink()} disabled={copyingInvite}>
            <LinkIcon className="h-4 w-4 mr-2" />
            {copyingInvite ? "Generating..." : "Copy Link"}
          </Button>
        </section>

        <section className="glass-panel pinly-panel w-full min-w-0">
          <h2 className="text-xl font-semibold">Incoming requests</h2>
          <div className="mt-4 space-y-3">
            {state.incomingRequests.map((request) => (
              <div key={request.id} className="flex w-full min-w-0 items-center justify-between rounded-[1.35rem] border bg-[var(--surface-soft)] p-3">
                <ProfileLink
                  username={request.fromUser.username}
                  className="mr-3 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-strong)]"
                >
                  <Avatar name={request.fromUser.name} src={request.fromUser.avatarUrl} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{request.fromUser.name}</p>
                    <p className="truncate text-sm text-[var(--foreground)]/58">@{request.fromUser.username}</p>
                  </div>
                </ProfileLink>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" onClick={() => respond(request.id, "decline", request.fromUser.username)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => respond(request.id, "accept", request.fromUser.username)}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!state.incomingRequests.length && (
              <div className="rounded-3xl border border-dashed bg-[var(--surface-soft)] p-6 text-sm text-[var(--foreground)]/60">
                No pending requests right now. New requests will show up here as your circle grows.
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel pinly-panel w-full min-w-0">
          <h2 className="text-xl font-semibold">Your friends</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {state.friends.map((friend) => (
              <div key={friend.id} className="w-full min-w-0 rounded-[1.35rem] border bg-[var(--surface-soft)] p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={`/profile/${friend.username}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition hover:bg-[var(--surface-strong)]">
                    <Avatar name={friend.name} src={friend.avatarUrl} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{friend.name}</p>
                      <p className="text-sm text-[var(--foreground)]/58 truncate">@{friend.username}</p>
                    </div>
                  </Link>
                  <MessageFriendButton
                    friendId={friend.id}
                    label="Message"
                    variant="secondary"
                    className="h-10 shrink-0 px-3"
                  />
                </div>
              </div>
            ))}
            {!state.friends.length && (
              <div className="rounded-3xl border border-dashed bg-[var(--surface-soft)] p-6 text-sm text-[var(--foreground)]/60">
                Add your first friend to unlock the social map, sharing, and direct messages.
              </div>
            )}
          </div>
          {!!state.outgoingRequests.length && (
            <>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/45">Sent requests</h3>
              <div className="mt-3 space-y-3">
                {state.outgoingRequests.map((request) => (
                  <div key={request.id} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-[1.35rem] border bg-[var(--surface-soft)] p-3">
                    <ProfileLink
                      username={request.toUser.username}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-strong)]"
                    >
                      <Avatar name={request.toUser.name} src={request.toUser.avatarUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{request.toUser.name}</p>
                        <p className="truncate text-sm text-[var(--foreground)]/58">@{request.toUser.username}</p>
                      </div>
                    </ProfileLink>
                    <Button
                      variant="secondary"
                      className="shrink-0"
                      onClick={() => void clearRelationship(request.toUser.username, "request")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
