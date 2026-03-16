"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MessageFriendButton({
  friendId,
  label = "Message",
  variant = "secondary",
  className,
  fullWidth = false,
  onConversationOpened
}: {
  friendId: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  fullWidth?: boolean;
  onConversationOpened?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleOpen() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not open this conversation.");
      }

      const data = await response.json();
      router.push(`/messages/${data.groupId}`);
      onConversationOpened?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this conversation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => void handleOpen()}
      disabled={pending}
      className={cn(fullWidth && "w-full", className)}
    >
      {pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
