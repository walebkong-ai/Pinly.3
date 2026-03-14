"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Group = {
  id: string;
  name: string;
  _count: {
    members: number;
    messages: number;
  };
};

export function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Trips & Memories</p>
            <h1 className="mt-2 font-[var(--font-serif)] text-4xl">Your Groups</h1>
          </div>
          <Link
            href="/groups/create"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            New Group
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="text-sm text-[var(--foreground)]/60">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-white/50 p-6 text-sm text-[var(--foreground)]/60">
              You aren't in any groups yet. Create one to start a persistent trip history!
            </div>
          ) : (
            groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center justify-between rounded-3xl border bg-white/72 p-4 transition-colors hover:bg-white"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    <p className="text-sm text-[var(--foreground)]/60">
                      {group._count.members} members • {group._count.messages} messages
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
