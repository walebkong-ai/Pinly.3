"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, Newspaper, Plus, Search, UserRound, UsersRound, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
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
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/cities", label: "Cities", icon: Search },
  { href: "/profile/me", label: "Profile", icon: UserRound }
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [unreadGroupsCount, setUnreadGroupsCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadUnread() {
      try {
        const response = await fetch("/api/groups/unread");
        if (response.ok) {
          const data = await response.json();
          if (!ignore) {
            setUnreadGroupsCount(data.unreadCount || 0);
          }
        }
      } catch {
        // ignore
      }
    }
    void loadUnread();

    return () => { ignore = true; };
  }, [pathname]);

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <header className="glass-panel mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 rounded-[2rem] px-4 py-3">
        <div className="flex items-center gap-4">
          <Brand compact />
          <nav className="hidden items-center gap-2 md:flex">
            {primaryNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  pathname === href 
                    ? "bg-[var(--accent)] text-white z-10 shadow-sm" 
                    : "bg-white/65 text-[var(--foreground)]/72 hover:bg-white/85"
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
                  pathname === resolvedHref
                    ? "bg-[var(--accent)] text-white z-10 shadow-sm"
                    : "text-[var(--foreground)]/70 hover:bg-white/60"
                )}
              >
                <div className="relative">
                  <Icon className="relative z-20 h-4 w-4" />
                  {href === "/groups" && unreadGroupsCount > 0 && (
                    <div className="absolute -right-1.5 -top-1.5 z-30 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/50">
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
          <div className="hidden items-center gap-3 rounded-full bg-white/72 px-3 py-2 sm:flex">
            <Avatar name={user.name ?? user.username ?? "Me"} src={user.avatarUrl} className="h-9 w-9" />
            <div className="pr-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-[var(--foreground)]/55">@{user.username}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto max-w-[1600px] pb-24 pt-4",
          pathname === "/map" ? "max-w-[1700px]" : "max-w-[1500px]"
        )}
      >
        {children}
      </main>

      <nav className="glass-panel fixed inset-x-4 bottom-4 z-[950] flex items-center justify-between rounded-full px-3 py-1.5 md:hidden">
        {[...primaryNavItems, ...secondaryNavItems.filter((item) => item.href !== "/cities")].map(({ href, label, icon: Icon }) => {
          const resolvedHref = href === "/profile/me" ? `/profile/${user.username}` : href;
          return (
            <Link
              key={href}
              href={resolvedHref}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] sm:px-3 sm:text-[11px] font-medium",
                pathname === resolvedHref ? "text-[var(--accent)]" : "text-[var(--foreground)]/58"
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {href === "/groups" && unreadGroupsCount > 0 && (
                  <div className="absolute -right-1.5 -top-1 z-30 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-1 ring-white/30">
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
