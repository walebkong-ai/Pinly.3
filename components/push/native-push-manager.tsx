"use client";

import type { PluginListenerHandle } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNetworkStatus } from "@/components/network/network-status-provider";
import { triggerLightImpact, triggerSuccessHaptic, triggerWarningHaptic } from "@/lib/native-haptics";
import { getNativePlatform, isNativePlatform } from "@/lib/native-platform";
import {
  PINLY_PUSH_CHANNEL_ID,
  PINLY_PUSH_CHANNEL_NAME,
  PINLY_PUSH_OPEN_PROMPT_EVENT,
  PINLY_PUSH_PROMPT_STORAGE_KEY,
  PINLY_PUSH_UNREGISTER_EVENT,
  PINLY_PUSH_VALUE_CONTEXT_STORAGE_KEY,
  resolvePushNavigationPath,
  shouldTrackValueContext
} from "@/lib/push-notifications";
import { NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-events";
import { PushPermissionSheet } from "@/components/push/push-permission-sheet";

type PromptState = {
  grantedAt?: number;
  dismissedAt?: number;
  deniedAt?: number;
};

type PushPermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied" | "unknown";

const PUSH_PROMPT_CONTEXT_THRESHOLD = 2;
const PUSH_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function readPromptState(): PromptState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(PINLY_PUSH_PROMPT_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as PromptState) : {};
  } catch {
    return {};
  }
}

function writePromptState(nextState: PromptState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PINLY_PUSH_PROMPT_STORAGE_KEY, JSON.stringify(nextState));
}

function readValueContextCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.localStorage.getItem(PINLY_PUSH_VALUE_CONTEXT_STORAGE_KEY);
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : 0;
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function incrementValueContextCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  const nextValue = readValueContextCount() + 1;
  window.localStorage.setItem(PINLY_PUSH_VALUE_CONTEXT_STORAGE_KEY, String(nextValue));
  return nextValue;
}

function normalizeNotificationData(data: unknown) {
  if (!data || typeof data !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, typeof value === "string" ? value : String(value)])
  );
}

export function NativePushManager() {
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();
  const currentTokenRef = useRef<string | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);
  const listenersRegisteredRef = useRef(false);
  const listenerHandlesRef = useRef<PluginListenerHandle[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [permissionState, setPermissionState] = useState<PushPermissionState>("unknown");
  const [valueContextCount, setValueContextCount] = useState(0);
  const [isNativeClient, setIsNativeClient] = useState(false);

  const persistToken = useCallback(async (token: string) => {
    const platform = getNativePlatform();

    if ((platform !== "ios" && platform !== "android") || !isOnline) {
      return;
    }

    currentTokenRef.current = token;

    try {
      const response = await fetch("/api/push-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          platform
        })
      });

      if (!response.ok) {
        throw new Error("Could not save the device token.");
      }
    } catch {
      toast.error("Pinly could not finish notification setup yet.");
    }
  }, [isOnline]);

  const syncToken = useCallback(async () => {
    if (!isNativeClient) {
      return;
    }

    try {
      const tokenResult = await FirebaseMessaging.getToken();

      if (tokenResult.token) {
        await persistToken(tokenResult.token);
      }
    } catch {
      // Keep the rest of the app responsive when push setup is unavailable.
    }
  }, [isNativeClient, persistToken]);

  const unregisterCurrentToken = useCallback(async () => {
    if (!isNativeClient) {
      return;
    }

    let activeToken = currentTokenRef.current;

    if (!activeToken) {
      try {
        const tokenResult = await FirebaseMessaging.getToken();
        activeToken = tokenResult.token || null;
      } catch {
        activeToken = null;
      }
    }

    if (activeToken) {
      try {
        await fetch(`/api/push-tokens?token=${encodeURIComponent(activeToken)}`, {
          method: "DELETE"
        });
      } catch {
        // Signing out should still succeed even if token cleanup fails.
      }
    }

    try {
      await FirebaseMessaging.deleteToken();
    } catch {
      // Ignore cleanup failures during sign-out.
    }

    currentTokenRef.current = null;
  }, [isNativeClient]);

  useEffect(() => {
    setIsNativeClient(isNativePlatform());
  }, []);

  useEffect(() => {
    if (!isNativeClient) {
      return;
    }

    setValueContextCount(readValueContextCount());
  }, [isNativeClient]);

  useEffect(() => {
    if (!isNativeClient || !shouldTrackValueContext(pathname)) {
      return;
    }

    if (lastTrackedPathRef.current === pathname) {
      return;
    }

    lastTrackedPathRef.current = pathname;
    setValueContextCount(incrementValueContextCount());
  }, [isNativeClient, pathname]);

  useEffect(() => {
    if (!isNativeClient) {
      return;
    }

    let disposed = false;

    async function initializePush() {
      try {
        const support = await FirebaseMessaging.isSupported();

        if (!support.isSupported) {
          return;
        }

        await FirebaseMessaging.createChannel({
          id: PINLY_PUSH_CHANNEL_ID,
          name: PINLY_PUSH_CHANNEL_NAME,
          description: "Likes, comments, shares, and friend activity",
          importance: 4,
          visibility: 1
        }).catch(() => {
          // The channel API is Android only. Ignore unsupported platforms.
        });

        if (!listenersRegisteredRef.current) {
          listenersRegisteredRef.current = true;

          listenerHandlesRef.current.push(
            await FirebaseMessaging.addListener("tokenReceived", (event) => {
              void persistToken(event.token);
            })
          );

          listenerHandlesRef.current.push(
            await FirebaseMessaging.addListener("notificationReceived", (event) => {
              if (disposed) {
                return;
              }

              const data = normalizeNotificationData(event.notification.data);
              const title = event.notification.title?.trim() || "New activity on Pinly";
              const body = event.notification.body?.trim() || "Open Pinly to see what's new.";
              const path = resolvePushNavigationPath(data);

              window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
              void triggerLightImpact();

              toast(title, {
                description: body,
                action: path
                  ? {
                      label: "Open",
                      onClick: () => {
                        startTransition(() => {
                          router.push(path);
                        });
                      }
                    }
                  : undefined
              });
            })
          );

          listenerHandlesRef.current.push(
            await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
              const data = normalizeNotificationData(event.notification.data);
              const path = resolvePushNavigationPath(data);

              window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
              void triggerSuccessHaptic();

              if (!path) {
                return;
              }

              startTransition(() => {
                router.push(path);
              });
            })
          );
        }

        const permission = await FirebaseMessaging.checkPermissions();

        if (disposed) {
          return;
        }

        setPermissionState(permission.receive);

        if (permission.receive === "granted") {
          writePromptState({
            ...readPromptState(),
            grantedAt: Date.now()
          });
          await syncToken();
        }
      } catch {
        if (!disposed) {
          setPermissionState("unknown");
        }
      }
    }

    void initializePush();

    return () => {
      disposed = true;

      const activeHandles = listenerHandlesRef.current;
      listenerHandlesRef.current = [];
      listenersRegisteredRef.current = false;

      if (activeHandles.length > 0) {
        void Promise.allSettled(activeHandles.map((handle) => handle.remove()));
      }
    };
  }, [isNativeClient, persistToken, router, syncToken]);

  useEffect(() => {
    if (!isNativeClient || !isOnline || permissionState !== "granted") {
      return;
    }

    void syncToken();
  }, [isNativeClient, isOnline, permissionState, syncToken]);

  useEffect(() => {
    if (!isNativeClient) {
      return;
    }

    const handleOpenPrompt = () => {
      if (permissionState === "granted") {
        toast.message("Notifications are already on.", {
          description: "Use your device settings if you want to change alert permissions."
        });
        return;
      }

      setPromptOpen(true);
    };
    const handleUnregister = () => {
      void unregisterCurrentToken();
    };

    window.addEventListener(PINLY_PUSH_OPEN_PROMPT_EVENT, handleOpenPrompt);
    window.addEventListener(PINLY_PUSH_UNREGISTER_EVENT, handleUnregister);

    return () => {
      window.removeEventListener(PINLY_PUSH_OPEN_PROMPT_EVENT, handleOpenPrompt);
      window.removeEventListener(PINLY_PUSH_UNREGISTER_EVENT, handleUnregister);
    };
  }, [isNativeClient, permissionState, unregisterCurrentToken]);

  useEffect(() => {
    if (!isNativeClient || permissionState === "granted" || promptOpen || valueContextCount < PUSH_PROMPT_CONTEXT_THRESHOLD) {
      return;
    }

    const promptState = readPromptState();
    const lastHandledAt = Math.max(promptState.dismissedAt ?? 0, promptState.deniedAt ?? 0);

    if (lastHandledAt > Date.now() - PUSH_PROMPT_COOLDOWN_MS) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPromptOpen(true);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isNativeClient, permissionState, promptOpen, valueContextCount]);

  async function handleEnableNotifications() {
    setRequestingPermission(true);

    try {
      const result = await FirebaseMessaging.requestPermissions();
      setPermissionState(result.receive);

      if (result.receive !== "granted") {
        writePromptState({
          ...readPromptState(),
          deniedAt: Date.now()
        });
        setPromptOpen(false);
        void triggerWarningHaptic();
        toast.message("Notifications stayed off.", {
          description: "You can keep using Pinly normally and enable alerts later from Settings."
        });
        return;
      }

      await syncToken();
      writePromptState({
        ...readPromptState(),
        grantedAt: Date.now()
      });
      setPromptOpen(false);
      void triggerSuccessHaptic();
      toast.success("Pinly alerts are on.");
    } finally {
      setRequestingPermission(false);
    }
  }

  if (!isNativeClient) {
    return null;
  }

  return (
    <PushPermissionSheet
      open={promptOpen}
      requesting={requestingPermission}
      onEnable={() => void handleEnableNotifications()}
      onOpenChange={(open) => {
        setPromptOpen(open);

        if (!open) {
          writePromptState({
            ...readPromptState(),
            dismissedAt: Date.now()
          });
        }
      }}
    />
  );
}
