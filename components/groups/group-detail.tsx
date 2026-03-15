"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send, Users, X, UserPlus, CheckCircle2, LoaderCircle, Share2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MESSAGES_UPDATED_EVENT } from "@/lib/notification-events";
import { cn } from "@/lib/utils";

type GroupDetails = {
  id: string;
  name: string;
  isDirect?: boolean;
  directUser?: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
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
  sharedPost?: {
    id: string;
    caption: string;
    placeName: string;
    city: string;
    country: string;
    thumbnailUrl: string;
  } | null;
};

export function GroupDetail({ groupId, viewerId }: { groupId: string; viewerId: string }) {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [friends, setFriends] = useState<Array<{ id: string; name: string; username: string; avatarUrl: string | null }>>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [addingMembers, setAddingMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function emitMessagesUpdated() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(MESSAGES_UPDATED_EVENT));
    }
  }

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
          emitMessagesUpdated();
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

  const openAddModal = async () => {
    if (group?.isDirect) {
      return;
    }

    setShowAddModal(true);
    setSelectedFriendIds(new Set());
    
    try {
      const response = await fetch("/api/friends/list");
      if (response.ok) {
        const data = await response.json();
        const existingMemberIds = new Set(group?.members.map(m => m.user.id));
        const availableFriends = data.friends.filter((f: any) => !existingMemberIds.has(f.id));
        setFriends(availableFriends);
      }
    } catch (e) {
      toast.error("Failed to load friends.");
    }
  };

  const submitAddMembers = async () => {
    if (selectedFriendIds.size === 0) return;
    setAddingMembers(true);
    
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedFriendIds) })
      });
      
      if (!response.ok) throw new Error("Failed to add members");
      
      toast.success("Members added successfully!");
      setShowAddModal(false);
      
      // Opt-in naive refresh
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroup(groupData.group);
      }
    } catch (e) {
      toast.error("An error occurred adding members.");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    const text = content.trim();
    setContent("");

    try {
      const response = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        emitMessagesUpdated();
      } else {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Could not send this message.");
        setContent(text);
      }
    } catch {
      toast.error("Could not send this message.");
      setContent(text);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-4 text-sm">Loading conversation...</div>;
  if (!group) return <div className="p-4 text-sm text-red-500">Conversation not found or access denied.</div>;

  const conversationName = group.isDirect ? group.directUser?.name ?? group.name : group.name;
  const conversationSubtitle = group.isDirect
    ? group.directUser
      ? `Direct message with @${group.directUser.username}`
      : "Direct conversation"
    : "Group chat for shared plans, memories, and updates";

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      {/* Conversation Info Sidebar */}
      <section className="glass-panel hidden flex-col rounded-[2rem] p-5 xl:flex">
        {group.isDirect && group.directUser ? (
          <Avatar
            name={group.directUser.name}
            src={group.directUser.avatarUrl}
            className="h-16 w-16 rounded-2xl border border-white/70"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Users className="h-8 w-8" />
          </div>
        )}
        <h1 className="mt-4 font-[var(--font-serif)] text-3xl">{conversationName}</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">{conversationSubtitle}</p>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-semibold uppercase tracking-widest text-xs text-[var(--foreground)]/45">
            {group.isDirect ? `People (${group.members.length})` : `Members (${group.members.length})`}
          </h2>
          {!group.isDirect ? (
            <Button variant="ghost" onClick={openAddModal} className="h-7 gap-1 px-2 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10">
              <UserPlus className="h-3 w-3" /> Add
            </Button>
          ) : null}
        </div>
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
          {group.isDirect && group.directUser ? (
            <Avatar name={group.directUser.name} src={group.directUser.avatarUrl} className="h-10 w-10 shrink-0" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Users className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="font-semibold">{conversationName}</h2>
            <p className="text-xs text-[var(--foreground)]/50">
              {group.isDirect ? conversationSubtitle : `${group.members.length} members`}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--foreground)]/50">
              {group.isDirect ? "No messages yet. Start the conversation." : "No messages here yet. Say hi!"}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3", msg.user.id === viewerId && "justify-end")}>
                {msg.user.id !== viewerId ? (
                  <Avatar name={msg.user.name} src={msg.user.avatarUrl} className="h-8 w-8 flex-shrink-0" />
                ) : null}
                <div className={cn("flex max-w-[85%] flex-col", msg.user.id === viewerId && "items-end")}>
                  <div className={cn("flex items-center gap-2", msg.user.id === viewerId && "justify-end")}>
                    <span className="text-sm font-medium">{msg.user.id === viewerId ? "You" : msg.user.name}</span>
                    <span className="text-xs text-[var(--foreground)]/45">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {msg.content.startsWith("[SHARED_POST]:") ? (
                    <div className="mt-1 w-[240px] overflow-hidden rounded-2xl border bg-white shadow-sm md:w-[280px]">
                      <div className="flex items-center gap-2 border-b bg-black/5 p-3 text-sm font-medium">
                        <Share2 className="h-4 w-4 text-[var(--accent)]" />
                        {msg.user.id === viewerId ? "You shared a post" : "Shared a post"}
                      </div>
                      {msg.sharedPost ? (
                        <Link href={`/posts/${msg.sharedPost.id}`} className="group relative block">
                          <div className="aspect-[4/3] w-full bg-black/5 relative">
                            {msg.sharedPost.thumbnailUrl ? (
                              <img 
                                src={msg.sharedPost.thumbnailUrl} 
                                alt={msg.sharedPost.caption?.trim() || msg.sharedPost.placeName || "Shared post"}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon size={32} className="text-[var(--foreground)]/20" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <p className="line-clamp-2 font-[var(--font-serif)] text-base leading-tight drop-shadow-sm">
                                {msg.sharedPost.caption?.trim() || `Memory from ${msg.sharedPost.placeName}`}
                              </p>
                              <p className="mt-1 text-xs text-white/80 line-clamp-1">
                                {msg.sharedPost.placeName}, {msg.sharedPost.city}, {msg.sharedPost.country}
                              </p>
                            </div>
                          </div>
                          <div className="p-3 bg-white text-center text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors">
                            Open memory
                          </div>
                        </Link>
                      ) : (
                        <div className="p-4 text-center text-sm text-[var(--foreground)]/60">
                          Post unavailable or you do not have permission to view it.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "mt-1 inline-block whitespace-pre-wrap break-words rounded-2xl p-3 text-sm shadow-sm md:max-w-[80%]",
                        msg.user.id === viewerId
                          ? "rounded-tr-none bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "rounded-tl-none bg-white text-[var(--foreground)]"
                      )}
                    >
                      {msg.content}
                    </div>
                  )}
                </div>
                {msg.user.id === viewerId ? (
                  <Avatar name={msg.user.name} src={msg.user.avatarUrl} className="h-8 w-8 flex-shrink-0" />
                ) : null}
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
              placeholder={group.isDirect ? `Message ${conversationName}...` : "Type a message..."}
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

      {/* Add Member Modal */}
      {showAddModal && !group.isDirect ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-xl">Add to Group</h3>
              <Button variant="ghost" onClick={() => setShowAddModal(false)} className="h-8 w-8 rounded-full p-0 flex items-center justify-center">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-2 mb-6">
              {friends.length === 0 ? (
                <p className="text-sm text-[var(--foreground)]/60 py-4 text-center">No friends available to add.</p>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriendIds.has(friend.id);
                  return (
                    <div 
                      key={friend.id} 
                      onClick={() => {
                        const next = new Set(selectedFriendIds);
                        if (isSelected) next.delete(friend.id);
                        else next.add(friend.id);
                        setSelectedFriendIds(next);
                      }}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl p-2 transition w-full border ${isSelected ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent hover:bg-black/5"}`}
                    >
                      <Avatar name={friend.name} src={friend.avatarUrl} className="h-10 w-10 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{friend.name}</p>
                        <p className="text-xs text-[var(--foreground)]/58 truncate">@{friend.username}</p>
                      </div>
                      <div className="shrink-0 text-[var(--accent)] px-2">
                        {isSelected && <CheckCircle2 className="h-5 w-5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Button 
              className="w-full h-12 rounded-2xl text-base font-semibold" 
              disabled={selectedFriendIds.size === 0 || addingMembers}
              onClick={submitAddMembers}
            >
              {addingMembers ? <LoaderCircle className="h-5 w-5 animate-spin" /> : `Add ${selectedFriendIds.size} Member${selectedFriendIds.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
