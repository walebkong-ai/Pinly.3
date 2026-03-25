"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { FriendActivityItem, LayerMode } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { formatVisitDate } from "@/lib/utils";

export function FriendActivityPanel({
  items,
  layer
}: {
  items: FriendActivityItem[];
  layer: LayerMode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const mobileScrollStyle = {
    "--pinly-panel-max-height": "18rem",
    "--pinly-panel-reserve": "21rem"
  } as CSSProperties;

  function openPost(postId: string) {
    router.push(`/posts/${postId}`);
  }

  function handlePostKeyDown(event: KeyboardEvent<HTMLDivElement>, postId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPost(postId);
    }
  }

  return (
    <div 
      className={`glass-panel w-full max-w-sm transition-all ${
        collapsed ? "rounded-full p-2 px-4 md:rounded-[2rem] md:p-4" : "rounded-3xl p-3 md:rounded-[2rem] md:p-4"
      }`}
    >
      <button 
        onClick={() => setCollapsed(!collapsed)} 
        className="flex w-full items-center justify-between text-left"
        type="button"
      >
        <div className={collapsed ? "flex items-center gap-2 md:block" : ""}>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45 select-none">Friend activity</p>
          <h2 className={`font-[var(--font-serif)] text-xl md:text-3xl md:mt-2 ${collapsed ? "hidden md:block" : "mt-1 block"}`}>
            Recent nearby memories
          </h2>
        </div>
        <div className="flex shrink-0 items-center justify-center p-2 md:hidden">
          <ChevronDown className={`h-5 w-5 text-[var(--foreground)]/60 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </div>
      </button>

      <div
        className={`pinly-map-panel-scroll mt-2 md:mt-4 md:max-h-none md:overflow-visible space-y-2 md:space-y-3 pr-1 md:pr-0 ${collapsed ? "hidden md:block" : "block"}`}
        style={mobileScrollStyle}
      >
        {layer === "you" && (
          <div className="rounded-2xl border bg-[var(--surface-soft)] p-3 text-xs text-[var(--foreground)]/62 md:rounded-3xl md:p-4 md:text-sm">
            Switch the layer to <span className="font-medium text-[var(--foreground)]">Friends</span> or{" "}
            <span className="font-medium text-[var(--foreground)]">Both</span> to see social activity.
          </div>
        )}
        {layer !== "you" && !items.length && (
          <div className="rounded-2xl border bg-[var(--surface-soft)] p-3 text-xs text-[var(--foreground)]/62 md:rounded-3xl md:p-4 md:text-sm">
            No recent friend memories inside this map view yet.
          </div>
        )}
        {layer !== "you" &&
          items.map((item) => (
            <div
              key={item.id}
              role="link"
              tabIndex={0}
              onClick={() => openPost(item.postId)}
              onKeyDown={(event) => handlePostKeyDown(event, item.postId)}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border bg-[var(--surface-soft)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/40 md:gap-3 md:rounded-3xl md:p-3"
            >
              <ProfileLink username={item.user.username} className="shrink-0 rounded-full">
                <Avatar name={item.user.name} src={item.user.avatarUrl} className="h-8 w-8 md:h-9 md:w-9" />
              </ProfileLink>
              <div className="min-w-0">
                <ProfileLink
                  username={item.user.username}
                  className="rounded-md px-0.5 -ml-0.5 text-xs font-medium transition hover:text-[var(--foreground)] md:text-sm"
                >
                  {item.user.name}
                </ProfileLink>
                <p className="truncate text-xs md:text-sm text-[var(--foreground)]/64">
                  {item.placeName}, {item.city}
                </p>
                <p className="text-[10px] md:text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/42">
                  {formatVisitDate(item.visitedAt)}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
