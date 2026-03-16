"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Map, Newspaper, Plus, Search, Settings, UserRound, UsersRound, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileLink } from "@/components/profile/profile-link";
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

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [unreadGroupsCount, setUnreadGroupsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const notificationsActive = isNavActive(pathname, "/notifications");

  useEffect(() => {
    let ignore = false;

    async function loadUnreadCounts() {
      try {
        const [groupsResponse, notificationsResponse] = await Promise.all([
          fetch("/api/groups/unread"),
          fetch("/api/notifications/unread")
        ]);

        if (groupsResponse.ok) {
          const data = await groupsResponse.json();
          if (!ignore) {
            setUnreadGroupsCount(data.unreadCount || 0);
          }
        }

        if (notificationsResponse.ok) {
          const data = await notificationsResponse.json();
          if (!ignore) {
            setUnreadNotificationsCount(data.unreadCount || 0);
          }
        }
      } catch {
        // ignore
      }
    }

    const handleUnreadDataUpdated = () => {
      void loadUnreadCounts();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCounts();
      }
    };

    void loadUnreadCounts();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUnreadDataUpdated);
    window.addEventListener(MESSAGES_UPDATED_EVENT, handleUnreadDataUpdated);
    window.addEventListener("focus", handleUnreadDataUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      ignore = true;
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUnreadDataUpdated);
      window.removeEventListener(MESSAGES_UPDATED_EVENT, handleUnreadDataUpdated);
      window.removeEventListener("focus", handleUnreadDataUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="min-h-screen px-2 py-2 md:px-6 md:py-4">
      <header className="glass-panel mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-2 md:rounded-[2rem] md:gap-4 md:px-4 md:py-3">
        <div className="flex items-center gap-4">
          <Brand compact />
          <nav className="hidden items-center gap-2 md:flex">
            {primaryNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  isNavActive(pathname, href)
                    ? "z-10 bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "bg-[var(--surface-soft)] text-[var(--foreground)]/72 hover:bg-[var(--surface-strong)]"
                )}
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
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  isNavActive(pathname, resolvedHref)
                    ? "z-10 bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-[var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                )}
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
              "relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition",
              notificationsActive
                ? "border-[#185538] bg-[#185538] text-[#FCECDA] shadow-[0_14px_30px_rgba(24,85,56,0.22)]"
                : "border-[rgba(24,85,56,0.08)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            )}
          >
            <Bell className="h-5 w-5" />
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

      <main
        className={cn(
          "mx-auto max-w-[1600px] pb-20 pt-3 md:pb-24 md:pt-4",
          pathname === "/map" ? "max-w-[1700px]" : "max-w-[1500px]"
        )}
      >
        {children}
      </main>

      <nav className="glass-panel fixed inset-x-2 bottom-2 z-[950] flex items-center justify-between rounded-full px-2 py-1.5 md:hidden">
        {[...primaryNavItems, ...secondaryNavItems.filter((item) => item.href !== "/cities" && item.href !== "/settings")].map(({ href, label, icon: Icon }) => {
          const resolvedHref = href === "/profile/me" ? `/profile/${user.username}` : href;
          return (
            <Link
              key={href}
              href={resolvedHref}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition sm:px-3 sm:text-[11px]",
                isNavActive(pathname, resolvedHref)
                  ? "bg-[rgba(24,85,56,0.08)] text-[var(--foreground)]"
                  : "text-[var(--foreground)]/58 hover:bg-[var(--foreground)]/5"
              )}
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
