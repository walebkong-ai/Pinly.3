"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Heart,
  MessageCircle,
  MessageSquareReply,
  Share2,
  UserCheck,
  UserPlus
} from "lucide-react";
import type { NotificationSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-events";
import { getNotificationHref } from "@/lib/notifications";
import { cn } from "@/lib/utils";

function emitNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

function getNotificationCopy(notification: NotificationSummary) {
  switch (notification.type) {
    case "POST_LIKED":
      return {
        title: `${notification.actor.name} liked your post`,
        body: notification.post ? notification.post.placeName : "Open the post to see it."
      };
    case "POST_COMMENTED":
      return {
        title: `${notification.actor.name} commented on your post`,
        body: notification.comment?.content || notification.post?.placeName || "Open the post to read it."
      };
    case "COMMENT_REPLIED":
      return {
        title: `${notification.actor.name} replied to your comment`,
        body: notification.comment?.content || notification.post?.placeName || "Open the post to read it."
      };
    case "POST_SHARED":
      return {
        title: `${notification.actor.name} shared your post`,
        body: notification.post ? notification.post.placeName : "Open the post to see it."
      };
    case "FRIEND_REQUEST_RECEIVED":
      return {
        title: `${notification.actor.name} sent you a friend request`,
        body: "Open Friends to respond."
      };
    case "FRIEND_REQUEST_ACCEPTED":
      return {
        title: `${notification.actor.name} accepted your friend request`,
        body: "You can now see each other's memories."
      };
    default:
      return {
        title: "New notification",
        body: "Open to view."
      };
  }
}

function getNotificationIcon(notification: NotificationSummary) {
  switch (notification.type) {
    case "POST_LIKED":
      return Heart;
    case "POST_COMMENTED":
      return MessageCircle;
    case "COMMENT_REPLIED":
      return MessageSquareReply;
    case "POST_SHARED":
      return Share2;
    case "FRIEND_REQUEST_RECEIVED":
      return UserPlus;
    case "FRIEND_REQUEST_ACCEPTED":
      return UserCheck;
    default:
      return Bell;
  }
}

export function NotificationsList({
  initialNotifications
}: {
  initialNotifications: NotificationSummary[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  async function markNotificationsRead(notificationIds?: string[], markAll = false) {
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(markAll ? { markAll: true } : { notificationIds })
    });

    if (!response.ok) {
      throw new Error("Could not update notifications.");
    }

    emitNotificationsUpdated();
  }

  async function handleOpen(notification: NotificationSummary) {
    const href = getNotificationHref(notification);

    if (!notification.readAt) {
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item))
      );

      try {
        await markNotificationsRead([notification.id]);
      } catch {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, readAt: null } : item))
        );
      }
    }

    if (href) {
      router.push(href);
    }
  }

  async function handleMarkAllRead() {
    const now = new Date().toISOString();
    const previous = notifications;
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? now })));

    try {
      await markNotificationsRead(undefined, true);
    } catch {
      setNotifications(previous);
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-[1.75rem] border bg-[var(--surface-strong)] p-6 text-center">
        <p className="text-sm text-[var(--foreground)]/58">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between rounded-[1.5rem] border bg-[var(--surface-strong)] px-4 py-3">
        <div>
          <p className="text-sm font-medium">{unreadCount} unread</p>
          <p className="text-xs text-[var(--foreground)]/54">Likes, comments, replies, shares, and friend activity.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="rounded-full px-4"
          onClick={() => void handleMarkAllRead()}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </section>

      <section className="space-y-3">
        {notifications.map((notification) => {
          const copy = getNotificationCopy(notification);
          const Icon = getNotificationIcon(notification);
          const isUnread = !notification.readAt;

          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => void handleOpen(notification)}
              className={cn(
                "w-full rounded-[1.75rem] border p-4 text-left transition active:scale-[0.99]",
                isUnread
                  ? "border-[rgba(255,95,162,0.18)] bg-[rgba(255,95,162,0.07)]"
                  : "bg-[var(--surface-strong)] hover:bg-[var(--surface-soft)]"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar name={notification.actor.name} src={notification.actor.avatarUrl} className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--social-accent)]">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        {isUnread ? <span className="h-2 w-2 rounded-full bg-[var(--social-accent)]" /> : null}
                      </div>
                      <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{copy.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--foreground)]/62">{copy.body}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-[var(--foreground)]/48">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                      <ChevronRight className="ml-auto mt-3 h-4 w-4 text-[var(--foreground)]/28" />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
