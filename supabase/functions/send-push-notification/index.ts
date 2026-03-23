import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  buildNotificationDeepLink,
  buildNotificationMapLink,
  getPushNotificationBody,
  getPushNotificationTitle
} from "../../../lib/push-notifications.ts";

type NotificationRecord = {
  id: string;
  userId: string;
  actorId: string;
  type: string;
  postId?: string | null;
  commentId?: string | null;
  friendRequestId?: string | null;
};

type NotificationWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRecord | null;
  old_record: NotificationRecord | null;
};

type ActorRecord = {
  id: string;
  name: string | null;
  username: string | null;
};

type PostRecord = {
  id: string;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CommentRecord = {
  id: string;
  content: string | null;
};

type PushTokenRecord = {
  token: string;
  platform: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function toBase64Url(value: Uint8Array | string) {
  const sourceBytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const binary = Array.from(sourceBytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodePemPrivateKey(pem: string) {
  const normalizedPem = pem.replace(/\\n/g, "\n");
  const base64 = normalizedPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createFirebaseAccessToken() {
  const clientEmail = requireEnv("FCM_CLIENT_EMAIL");
  const privateKey = requireEnv("FCM_PRIVATE_KEY");
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 60 * 60;
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    iat: issuedAt,
    exp: expiresAt
  };
  const signingInput = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    decodePemPrivateKey(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const assertion = `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Firebase access token: ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function fetchNotificationContext(supabase: ReturnType<typeof createClient>, notification: NotificationRecord) {
  const [actorResponse, postResponse, commentResponse, tokensResponse, unreadCountResponse] = await Promise.all([
    supabase.from("User").select("id, name, username").eq("id", notification.actorId).maybeSingle<ActorRecord>(),
    notification.postId
      ? supabase
          .from("Post")
          .select("id, placeName, latitude, longitude")
          .eq("id", notification.postId)
          .maybeSingle<PostRecord>()
      : Promise.resolve({ data: null, error: null }),
    notification.commentId
      ? supabase.from("Comment").select("id, content").eq("id", notification.commentId).maybeSingle<CommentRecord>()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("push_tokens").select("token, platform").eq("user_id", notification.userId).returns<PushTokenRecord[]>(),
    supabase
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("userId", notification.userId)
      .is("readAt", null)
  ]);

  if (actorResponse.error) {
    throw actorResponse.error;
  }

  if (postResponse.error) {
    throw postResponse.error;
  }

  if (commentResponse.error) {
    throw commentResponse.error;
  }

  if (tokensResponse.error) {
    throw tokensResponse.error;
  }

  if (unreadCountResponse.error) {
    throw unreadCountResponse.error;
  }

  return {
    actor: actorResponse.data,
    post: postResponse.data,
    comment: commentResponse.data,
    tokens: tokensResponse.data ?? [],
    unreadCount: unreadCountResponse.count ?? 0
  };
}

async function deleteDeadToken(supabase: ReturnType<typeof createClient>, token: string) {
  await supabase.from("push_tokens").delete().eq("token", token);
}

async function sendPushMessage({
  accessToken,
  badgeCount,
  body,
  mapPath,
  path,
  platform,
  projectId,
  title,
  token,
  actorUsername,
  postId,
  latitude,
  longitude,
  type
}: {
  accessToken: string;
  badgeCount: number;
  body: string;
  mapPath: string | null;
  path: string;
  platform: string;
  projectId: string;
  title: string;
  token: string;
  actorUsername: string | null | undefined;
  postId: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  type: string;
}) {
  const data: Record<string, string> = {
    path,
    type
  };

  if (mapPath) {
    data.mapPath = mapPath;
  }

  if (actorUsername) {
    data.actorUsername = actorUsername;
  }

  if (postId) {
    data.postId = postId;
  }

  if (typeof latitude === "number") {
    data.latitude = String(latitude);
  }

  if (typeof longitude === "number") {
    data.longitude = String(longitude);
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title,
          body
        },
        data,
        android: {
          notification: {
            channelId: "pinly-activity",
            clickAction: "FCM_PLUGIN_ACTIVITY"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: badgeCount
            }
          }
        }
      }
    })
  });

  if (response.ok) {
    return;
  }

  const errorText = await response.text();

  if (response.status === 404 || errorText.includes("UNREGISTERED") || errorText.includes("INVALID_ARGUMENT")) {
    throw new Error(`DELETE_TOKEN:${platform}:${token}`);
  }

  throw new Error(`FCM_SEND_FAILED:${response.status}:${errorText}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  const configuredSecret = Deno.env.get("SUPABASE_PUSH_WEBHOOK_SECRET")?.trim();
  const authorizationHeader = request.headers.get("authorization")?.trim();

  if (configuredSecret && authorizationHeader !== `Bearer ${configuredSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  let payload: NotificationWebhookPayload;

  try {
    payload = (await request.json()) as NotificationWebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  if (payload.type !== "INSERT" || payload.table !== "Notification" || !payload.record) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const projectId = requireEnv("FCM_PROJECT_ID");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const notification = payload.record;
    const context = await fetchNotificationContext(supabase, notification);

    if (!context.tokens.length) {
      return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const accessToken = await createFirebaseAccessToken();
    const title = getPushNotificationTitle({
      type: notification.type as never,
      actorName: context.actor?.name
    });
    const body = getPushNotificationBody({
      type: notification.type as never,
      placeName: context.post?.placeName,
      commentContent: context.comment?.content
    });
    const path = buildNotificationDeepLink({
      type: notification.type,
      postId: notification.postId,
      latitude: context.post?.latitude,
      longitude: context.post?.longitude,
      actorUsername: context.actor?.username
    });
    const mapPath = buildNotificationMapLink({
      postId: notification.postId,
      latitude: context.post?.latitude,
      longitude: context.post?.longitude
    });

    let delivered = 0;

    for (const tokenRecord of context.tokens) {
      try {
        await sendPushMessage({
          accessToken,
          badgeCount: context.unreadCount,
          body,
          mapPath,
          path,
          platform: tokenRecord.platform,
          projectId,
          title,
          token: tokenRecord.token,
          actorUsername: context.actor?.username,
          postId: notification.postId,
          latitude: context.post?.latitude,
          longitude: context.post?.longitude,
          type: notification.type
        });
        delivered += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.startsWith("DELETE_TOKEN:")) {
          await deleteDeadToken(supabase, tokenRecord.token);
          continue;
        }

        console.error("Push delivery failed:", message);
      }
    }

    return new Response(JSON.stringify({ ok: true, delivered }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Push delivery handler failed:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown push delivery failure"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
