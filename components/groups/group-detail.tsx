"use client";

import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GroupDetails = {
  id: string;
  name: string;
  members: Array<{
    user: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
    role: string;
    joinedAt: string;
  }>;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
};

export function GroupDetail({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [groupRes, msgRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch(`/api/groups/${groupId}/messages`),
        ]);

        if (groupRes.ok && msgRes.ok) {
          const groupData = await groupRes.json();
          const msgData = await msgRes.json();
          setGroup(groupData.group);
          setMessages(msgData.messages);
          scrollToBottom();
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchAll();
  }, [groupId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    const text = content.trim();
    setContent("");

    const response = await fetch(`/api/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });

    setSending(false);

    if (response.ok) {
      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      scrollToBottom();
    }
  };

  if (loading) return <div className="p-4 text-sm">Loading group...</div>;
  if (!group) return <div className="p-4 text-sm text-red-500">Group not found or access denied.</div>;

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      {/* Group Info Sidebar */}
      <section className="glass-panel hidden flex-col rounded-[2rem] p-5 xl:flex">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
          <Users className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-[var(--font-serif)] text-3xl">{group.name}</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          Persistent Trip History & Messages
        </p>

        <h2 className="mt-8 font-semibold uppercase tracking-widest text-xs text-[var(--foreground)]/45">Members ({group.members.length})</h2>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {group.members.map((member) => (
            <div key={member.user.id} className="flex items-center gap-3 rounded-2xl bg-white/50 p-2">
              <Avatar name={member.user.name} src={member.user.avatarUrl} className="h-8 w-8" />
              <div>
                <p className="text-sm font-medium">{member.user.name}</p>
                <p className="text-xs text-[var(--foreground)]/60">@{member.user.username} {member.role === "OWNER" && "• Owner"}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Messaging Area */}
      <section className="glass-panel relative flex flex-col rounded-[2rem] overflow-hidden">
        {/* Mobile Header */}
        <div className="flex items-center gap-3 border-b border-black/5 bg-white/40 p-4 xl:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">{group.name}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--foreground)]/50">
              No messages here yet. Say hi!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <Avatar name={msg.user.name} src={msg.user.avatarUrl} className="h-8 w-8 flex-shrink-0" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{msg.user.name}</span>
                    <span className="text-xs text-[var(--foreground)]/45">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-1 inline-block rounded-2xl rounded-tl-none bg-white p-3 text-sm shadow-sm md:max-w-[80%]">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="border-t border-black/5 bg-white/40 p-4">
          <div className="relative flex items-center">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message..."
              className="pr-12 rounded-full bg-white border-none shadow-sm h-12"
            />
            <Button
              type="submit"
              disabled={!content.trim() || sending}
              className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-full p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
