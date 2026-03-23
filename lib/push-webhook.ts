type NotificationWebhookPayload = {
  type: "INSERT";
  table: "Notification";
  schema: "public";
  record: {
    id: string;
    userId: string;
    actorId: string;
    type: string;
    postId?: string | null;
    commentId?: string | null;
    friendRequestId?: string | null;
    createdAt?: string | Date | null;
  };
  old_record: null;
};

function buildPushFunctionUrl() {
  const explicitUrl = process.env.SUPABASE_PUSH_FUNCTION_URL?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-push-notification`;
}

export async function sendNotificationToPushFunction(payload: NotificationWebhookPayload) {
  const endpoint = buildPushFunctionUrl();

  if (!endpoint) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const sharedSecret = process.env.SUPABASE_PUSH_WEBHOOK_SECRET?.trim();

  if (sharedSecret) {
    headers.Authorization = `Bearer ${sharedSecret}`;
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store"
    });
  } catch (error) {
    console.error("Push webhook delivery skipped:", error);
  }
}
