"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { Share2, Search, Users, CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GroupOption = {
  id: string;
  name: string;
  memberCount: number;
};

interface ShareSheetProps {
  postId: string;
}

export function ShareSheet({ postId }: ShareSheetProps) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && groups.length === 0) {
      loadGroups();
    }
  }, [open]);

  async function loadGroups() {
    setLoading(true);
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        const mapped = data.groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          memberCount: g._count.members,
        }));
        setGroups(mapped);
      }
    } catch {
      toast.error("Failed to load groups for sharing.");
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleShare() {
    if (selectedGroups.size === 0) return;

    setSending(true);
    try {
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: Array.from(selectedGroups) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to share post");
      }

      toast.success("Post shared successfully!");
      setOpen(false);
      
      // Reset selected
      setTimeout(() => setSelectedGroups(new Set()), 400);
      
    } catch (error: any) {
      toast.error(error.message || "An error occurred while sharing.");
    } finally {
      setSending(false);
    }
  }

  const toggleGroup = (id: string) => {
    const next = new Set(selectedGroups);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedGroups(next);
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--foreground)]/60 transition-colors hover:bg-[var(--foreground)]/5 active:scale-95">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[200] mt-24 flex h-[85vh] flex-col rounded-t-[2.5rem] bg-[var(--surface-strong)] pb-safe after:absolute after:inset-x-0 after:bottom-[-100px] after:h-[100px] after:bg-[var(--surface-strong)] md:h-[75vh]">
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--foreground)]/15" />
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            <h2 className="font-[var(--font-serif)] text-2xl font-semibold">Share to Group</h2>
            
            <div className="mt-4 relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground)]/40" />
              <Input
                placeholder="Search groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-2xl border-none bg-[var(--surface-soft)] pl-10"
              />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-2 pb-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoaderCircle className="h-6 w-6 animate-spin text-[var(--accent)]" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <p className="text-center text-sm text-[var(--foreground)]/50 py-8">
                  No groups found.
                </p>
              ) : (
                filteredGroups.map((group) => {
                  const isSelected = selectedGroups.has(group.id);
                  return (
                    <div
                      key={group.id}
                      onClick={() => toggleGroup(group.id)}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl p-3 transition-colors border ${
                        isSelected
                          ? "border-[var(--social-accent)] bg-[var(--social-accent-soft)]"
                          : "border-transparent hover:bg-[var(--foreground)]/5"
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.name}</p>
                        <p className="text-xs text-[var(--foreground)]/60">
                          {group.memberCount} member{group.memberCount !== 1 && "s"}
                        </p>
                      </div>
                      <div className="shrink-0 px-2 text-[var(--social-accent)]">
                        {isSelected && <CheckCircle2 className="h-6 w-6" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 mt-auto">
              <Button 
                onClick={handleShare} 
                disabled={selectedGroups.size === 0 || sending}
                className="w-full h-14 rounded-2xl text-[15px] font-semibold"
              >
                {sending ? (
                  <LoaderCircle className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  `Send to ${selectedGroups.size} group${selectedGroups.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
