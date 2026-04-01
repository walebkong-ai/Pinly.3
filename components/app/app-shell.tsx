"use client";

import React, { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Map, Newspaper, Plus, Search, Settings, UserRound, UsersRound, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { ScreenTransition } from "@/components/app/screen-transition";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/brand";
import { NativePushManager } from "@/components/push/native-push-manager";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileLink } from "@/components/profile/profile-link";
import { triggerLightImpact } from "@/lib/native-haptics";
import { MESSAGES_UPDATED_EVENT, NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-events";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  initialUnreadGroupsCount?: number;
  initialUnreadNotificationsCount?: number;
};

const primaryNavItems = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/feed", label: "Feed", icon: Newspaper }
];

const secondaryNavItems = [
  { href: "/friends", label: "Friends", icon: UsersRound },
  { href: "/messages", label: "Messages", icon: Users },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/cities", label: "Cities", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile/me", label: "Profile", icon: UserRound }
];

export const NOTIFICATION_BUTTON_ACTIVE_BACKGROUND = "#185538";
export const NOTIFICATION_BUTTON_ACTIVE_ICON = "#FCECDA";

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const UNREAD_COUNTS_REFRESH_INTERVAL_MS = 15_000;

export function AppShell({
  children,
  user,
  initialUnreadGroupsCount = 0,
  initialUnreadNotificationsCount = 0
}: AppShellProps) {
  const pathname = usePathname();
  const [unreadGroupsCount, setUnreadGroupsCount] = useState(initialUnreadGroupsCount);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(initialUnreadNotificationsCount);
  const lastUnreadRefreshAtRef = useRef(0);
  const pendingUnreadRefreshRef = useRef<Promise<void> | null>(null);
  const notificationsActive = isNavActive(pathname, "/notifications");
  const notificationButtonStyle: CSSProperties | undefined = notificationsActive
    ? {
        backgroundColor: NOTIFICATION_BUTTON_ACTIVE_BACKGROUND,
        borderColor: NOTIFICATION_BUTTON_ACTIVE_BACKGROUND,
        color: NOTIFICATION_BUTTON_ACTIVE_ICON
      }
    : undefined;

  useEffect(() => {
    setUnreadGroupsCount(initialUnreadGroupsCount);
    lastUnreadRefreshAtRef.current = Date.now();
  }, [initialUnreadGroupsCount]);

  useEffect(() => {
    setUnreadNotificationsCount(initialUnreadNotificationsCount);
    lastUnreadRefreshAtRef.current = Date.now();
  }, [initialUnreadNotificationsCount]);

  const refreshUnreadCounts = useCallback(async (force = false) => {
    const now = Date.now();

    if (!force && now - lastUnreadRefreshAtRef.current < UNREAD_COUNTS_REFRESH_INTERVAL_MS) {
      return;
    }

    if (pendingUnreadRefreshRef.current) {
      return pendingUnreadRefreshRef.current;
    }

    const request = (async () => {
      try {
        const [groupsResponse, notificationsResponse] = await Promise.all([
          fetch("/api/groups/unread", { cache: "no-store" }),
          fetch("/api/notifications/unread", { cache: "no-store" })
        ]);

        if (groupsResponse.ok) {
          const data = await groupsResponse.json();
          setUnreadGroupsCount(data.unreadCount || 0);
        }

        if (notificationsResponse.ok) {
          const data = await notificationsResponse.json();
          setUnreadNotificationsCount(data.unreadCount || 0);
        }

        lastUnreadRefreshAtRef.current = Date.now();
      } catch {
        // ignore
      } finally {
        pendingUnreadRefreshRef.current = null;
      }
    })();

    pendingUnreadRefreshRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    const handleUnreadDataUpdated = () => {
      void refreshUnreadCounts(true);
    };
    const handleWindowFocus = () => {
      void refreshUnreadCounts();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCounts();
      }
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUnreadDataUpdated);
    window.addEventListener(MESSAGES_UPDATED_EVENT, handleUnreadDataUpdated);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUnreadDataUpdated);
      window.removeEventListener(MESSAGES_UPDATED_EVENT, handleUnreadDataUpdated);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshUnreadCounts]);

  return (
    <div className="pinly-app-shell md:px-6 md:pt-[max(1rem,var(--safe-area-top))]" data-pinly-app-shell="true">
      <NativePushManager />
      <header
        className="pinly-app-header glass-panel z-[940] flex flex-wrap items-center justify-between gap-2.5 rounded-[1.5rem] px-3 py-2.5 md:rounded-[2rem] md:gap-4 md:px-4 md:py-3"
        data-pinly-layout-region="header"
      >
        <div className="flex items-center gap-4">
          <Brand compact />
          <nav className="hidden items-center gap-2 md:flex">
            {primaryNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isNavActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "pinly-pressable relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  isNavActive(pathname, href)
                    ? "z-10 bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "bg-[var(--surface-soft)] text-[var(--foreground)]/72 hover:bg-[var(--surface-strong)]"
                )}
                onClick={() => {
                  void triggerLightImpact();
                }}
              >
                <Icon className="relative z-20 h-4 w-4" />
                <span className="relative z-20">{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {secondaryNavItems.map(({ href, label, icon: Icon }) => {
            const resolvedHref = href === "/profile/me" ? `/profile/${user.username}` : href;
            return (
              <Link
                key={href}
                href={resolvedHref}
                aria-current={isNavActive(pathname, resolvedHref) ? "page" : undefined}
                className={cn(
                  "pinly-pressable relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  isNavActive(pathname, resolvedHref)
                    ? "z-10 bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-[var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                )}
                onClick={() => {
                  void triggerLightImpact();
                }}
              >
                <div className="relative">
                  <Icon className="relative z-20 h-4 w-4" />
                  {href === "/messages" && unreadGroupsCount > 0 && (
                    <div className="absolute -right-1.5 -top-1.5 z-30 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--social-accent)] px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-[rgba(255,250,244,0.72)]">
                      {unreadGroupsCount > 99 ? "99+" : unreadGroupsCount}
                    </div>
                  )}
                </div>
                <span className="relative z-20">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            aria-label="Notifications"
            aria-current={notificationsActive ? "page" : undefined}
            className={cn(
              "pinly-pressable relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-[background-color,border-color,box-shadow]",
              notificationsActive
                ? "shadow-[0_14px_30px_rgba(24,85,56,0.22)]"
                : "border-[rgba(24,85,56,0.08)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            )}
            style={notificationButtonStyle}
            onClick={() => {
              void triggerLightImpact();
            }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full transition-[color,box-shadow]",
                notificationsActive ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" : "text-current"
              )}
            >
              <Bell className="h-4 w-4" />
            </span>
            {unreadNotificationsCount > 0 ? (
              <div
                className={cn(
                  "absolute -right-1.5 -top-1.5 z-30 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--social-accent)] px-1 text-[10px] font-bold text-white shadow-sm ring-1",
                  notificationsActive ? "ring-[#FCECDA]" : "ring-[rgba(255,250,244,0.72)]"
                )}
              >
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </div>
            ) : null}
          </Link>
          <ProfileLink
            username={user.username ?? "me"}
            className="hidden items-center gap-3 rounded-full bg-[var(--surface-soft)] px-3 py-2 transition hover:bg-[var(--surface-strong)] sm:flex"
            stopPropagation={false}
          >
            <Avatar name={user.name ?? user.username ?? "Me"} src={user.avatarUrl} className="h-9 w-9" />
            <div className="pr-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-[var(--foreground)]/55">@{user.username}</p>
            </div>
          </ProfileLink>
          <SignOutButton />
        </div>
      </header>

      <main className="pinly-app-main pt-2.5 md:pt-4" data-pinly-layout-region="content">
        <ScreenTransition>{children}</ScreenTransition>
      </main>

      <nav
        className="pinly-mobile-nav glass-panel fixed z-[950] flex items-center justify-between rounded-[1.5rem] px-1.5 py-1.5 md:hidden"
        data-pinly-layout-region="bottom-nav"
      >
        {[...primaryNavItems, ...secondaryNavItems.filter((item) => item.href !== "/cities" && item.href !== "/settings")].map(({ href, label, icon: Icon }) => {
          const resolvedHref = href === "/profile/me" ? `/profile/${user.username}` : href;
          return (
            <Link
              key={href}
              href={resolvedHref}
              aria-current={isNavActive(pathname, resolvedHref) ? "page" : undefined}
              className={cn(
                "pinly-pressable flex min-h-11 min-w-[3.1rem] flex-col items-center justify-center gap-1 rounded-[1rem] px-1.5 py-1.5 text-[10px] font-medium transition sm:px-3 sm:text-[11px]",
                isNavActive(pathname, resolvedHref)
                  ? "bg-[rgba(24,85,56,0.08)] text-[var(--foreground)]"
                  : "text-[var(--foreground)]/58 hover:bg-[var(--foreground)]/5"
              )}
              onClick={() => {
                void triggerLightImpact();
              }}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {href === "/messages" && unreadGroupsCount > 0 && (
                  <div className="absolute -right-1.5 -top-1 z-30 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[var(--social-accent)] px-0.5 text-[8px] font-bold text-white ring-1 ring-[rgba(255,250,244,0.68)]">
                    {unreadGroupsCount > 99 ? "99+" : unreadGroupsCount}
                  </div>
                )}
              </div>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
