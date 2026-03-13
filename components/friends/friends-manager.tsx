"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [state, setState] = useState<FriendState>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: []
  });

  async function refresh() {
    const response = await fetch("/api/friends/list");
    const data = await response.json();
    setState(data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    let ignore = false;

    async function search() {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!ignore) {
        setSearchResults(data.users ?? []);
      }
    }

    void search();

    return () => {
      ignore = true;
    };
  }, [query]);

  async function sendRequest(username: string) {
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Could not send friend request.");
      return;
    }

    toast.success("Friend request sent.");
    setQuery("");
    await refresh();
  }

  async function respond(requestId: string, action: "accept" | "decline") {
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
    await refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Grow your circle</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-4xl">Friends & requests</h1>
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username"
            className="pl-11"
          />
        </div>
        <div className="mt-5 space-y-3">
          {searchResults.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-3xl border bg-white/72 p-3">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} src={user.avatarUrl} />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-[var(--foreground)]/58">@{user.username}</p>
                </div>
              </div>
              {user.requestStatus === "none" && (
                <Button className="gap-2" onClick={() => sendRequest(user.username)}>
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              )}
              {user.requestStatus === "friends" && <span className="text-sm font-medium text-[var(--accent)]">Friends</span>}
              {user.requestStatus === "pending_sent" && (
                <span className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]/60">
                  <Clock3 className="h-4 w-4" />
                  Pending
                </span>
              )}
              {user.requestStatus === "pending_received" && (
                <span className="text-sm font-medium text-[var(--highlight)]">Respond below</span>
              )}
            </div>
          ))}
          {!searchResults.length && query.length >= 2 && (
            <div className="rounded-3xl border border-dashed bg-white/50 p-6 text-sm text-[var(--foreground)]/60">
              No matching usernames found.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4">
        <section className="glass-panel rounded-[2rem] p-5">
          <h2 className="text-xl font-semibold">Incoming requests</h2>
          <div className="mt-4 space-y-3">
            {state.incomingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-3xl border bg-white/72 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={request.fromUser.name} src={request.fromUser.avatarUrl} />
                  <div>
                    <p className="font-medium">{request.fromUser.name}</p>
                    <p className="text-sm text-[var(--foreground)]/58">@{request.fromUser.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => respond(request.id, "decline")}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => respond(request.id, "accept")}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!state.incomingRequests.length && (
              <div className="rounded-3xl border border-dashed bg-white/50 p-6 text-sm text-[var(--foreground)]/60">
                No pending requests right now.
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-5">
          <h2 className="text-xl font-semibold">Your friends</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {state.friends.map((friend) => (
              <div key={friend.id} className="rounded-3xl border bg-white/72 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={friend.name} src={friend.avatarUrl} />
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-sm text-[var(--foreground)]/58">@{friend.username}</p>
                  </div>
                </div>
              </div>
            ))}
            {!state.friends.length && (
              <div className="rounded-3xl border border-dashed bg-white/50 p-6 text-sm text-[var(--foreground)]/60">
                Add your first friend to unlock the social map.
              </div>
            )}
          </div>
          {!!state.outgoingRequests.length && (
            <>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/45">Sent requests</h3>
              <div className="mt-3 space-y-3">
                {state.outgoingRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-3 rounded-3xl border bg-white/72 p-3">
                    <Avatar name={request.toUser.name} src={request.toUser.avatarUrl} />
                    <div>
                      <p className="font-medium">{request.toUser.name}</p>
                      <p className="text-sm text-[var(--foreground)]/58">@{request.toUser.username}</p>
                    </div>
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
