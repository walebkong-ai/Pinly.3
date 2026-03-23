import { Prisma, type NotificationType, type PrismaClient } from "@prisma/client";
import type { NotificationSummary } from "@/types/app";
import { prisma } from "@/lib/prisma";
import { sendNotificationToPushFunction } from "@/lib/push-webhook";

type NotificationDb = PrismaClient | Prisma.TransactionClient;

type CreateNotificationInput = {
  db?: NotificationDb;
  userId: string;
  actorId: string;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  friendRequestId?: string | null;
  dedupeKey?: string | null;
};

export const notificationInclude = Prisma.validator<Prisma.NotificationInclude>()({
  actor: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true
    }
  },
  post: {
    select: {
      id: true,
      placeName: true,
      city: true,
      country: true
    }
  },
  comment: {
    select: {
      id: true,
      content: true
    }
  },
  friendRequest: {
    select: {
      id: true,
      status: true
    }
  }
});

export async function createNotification({
  db = prisma,
  userId,
  actorId,
  type,
  postId,
  commentId,
  friendRequestId,
  dedupeKey
}: CreateNotificationInput) {
  if (userId === actorId) {
    return null;
  }

  const data = {
    userId,
    actorId,
    type,
    postId: postId ?? null,
    commentId: commentId ?? null,
    friendRequestId: friendRequestId ?? null,
    dedupeKey: dedupeKey ?? null
  };

  if (dedupeKey) {
    const notification = await db.notification.upsert({
      where: { dedupeKey },
      update: {
        actorId,
        type,
        postId: postId ?? null,
        commentId: commentId ?? null,
        friendRequestId: friendRequestId ?? null,
        readAt: null,
        createdAt: new Date()
      },
      create: data
    });

    void sendNotificationToPushFunction({
      type: "INSERT",
      table: "Notification",
      schema: "public",
      record: notification,
      old_record: null
    });

    return notification;
  }

  const notification = await db.notification.create({ data });

  void sendNotificationToPushFunction({
    type: "INSERT",
    table: "Notification",
    schema: "public",
    record: notification,
    old_record: null
  });

  return notification;
}

export async function createNotificationSafely(input: CreateNotificationInput) {
  try {
    return await createNotification(input);
  } catch (error) {
    console.error("Notification delivery skipped:", error);
    return null;
  }
}

export function getNotificationHref(notification: NotificationSummary) {
  switch (notification.type) {
    case "POST_LIKED":
    case "POST_COMMENTED":
    case "COMMENT_REPLIED":
    case "POST_SHARED":
      return notification.post ? `/posts/${notification.post.id}` : null;
    case "FRIEND_REQUEST_RECEIVED":
    case "FRIEND_REQUEST_ACCEPTED":
      return "/friends";
    default:
      return null;
  }
}
