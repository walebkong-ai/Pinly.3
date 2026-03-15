"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Friend = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export function GroupCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/friends/list");
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    }
    void load();
  }, []);

  const toggleFriend = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required.");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Select at least one friend.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        memberIds: Array.from(selectedIds)
      })
    });

    setIsSubmitting(false);

    if (response.ok) {
      const data = await response.json();
      toast.success("Group created!");
      router.push(`/messages/${data.group.id}`);
    } else {
      const error = await response.json();
      toast.error(error.error || "Failed to create group.");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Messages</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-4xl">Create Group</h1>
        <p className="mt-2 max-w-md text-sm text-[var(--foreground)]/62">
          Start a shared conversation for a trip, city plan, or memory circle.
        </p>
        
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Group Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Europe Trip 2024" 
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Select Friends</label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {friends.length === 0 ? (
                <p className="text-sm text-[var(--foreground)]/60">No friends to add.</p>
              ) : (
                friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${selectedIds.has(friend.id) ? "border-[var(--accent)] bg-[var(--accent)]/5" : "bg-white/50 hover:bg-white/80"}`}
                    onClick={() => toggleFriend(friend.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={friend.name} src={friend.avatarUrl} className="h-8 w-8" />
                      <div>
                        <p className="text-sm font-medium">{friend.name}</p>
                        <p className="text-xs text-[var(--foreground)]/58">@{friend.username}</p>
                      </div>
                    </div>
                    <div className={`h-4 w-4 rounded-full border ${selectedIds.has(friend.id) ? "border-[var(--accent)] bg-[var(--accent)]" : "border-gray-300"}`} />
                  </div>
                ))
              )}
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleCreate} 
            disabled={isSubmitting || !name.trim() || selectedIds.size === 0}
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </section>
    </div>
  );
}
