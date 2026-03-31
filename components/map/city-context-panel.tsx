"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";
import type { CityContext } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { formatVisitDate } from "@/lib/utils";

export function CityContextPanel({ cityContext }: { cityContext: CityContext | null }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const mobileScrollStyle = {
    "--pinly-panel-max-height": "20rem",
    "--pinly-panel-reserve": "20rem"
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

  if (!cityContext) {
    return null;
  }

  return (
    <div 
      className={`glass-panel w-full max-w-md transition-all ${
        collapsed ? "rounded-full p-2 px-3.5 md:rounded-[2rem] md:p-4" : "rounded-[1.5rem] p-3 md:rounded-[2rem] md:p-4"
      }`}
    >
      <button 
        onClick={() => setCollapsed(!collapsed)} 
        className="flex w-full items-center justify-between text-left"
        type="button"
      >
        <div className={collapsed ? "flex items-center gap-2 md:block" : ""}>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45 select-none">City context</p>
          <h2 className={`font-[var(--font-serif)] text-[1.1rem] md:text-3xl md:mt-2 ${collapsed ? "hidden md:block" : "mt-1 block"}`}>
            {cityContext.city}, {cityContext.country}
          </h2>
          <p className={`text-xs md:text-sm text-[var(--foreground)]/62 md:mt-2 ${collapsed ? "hidden md:block" : "mt-1 block"}`}>
            {cityContext.friendCount} friends visited here
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-center p-2 md:hidden">
          <ChevronDown className={`h-5 w-5 text-[var(--foreground)]/60 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Animated expand/collapse on mobile, always visible on desktop */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${collapsed ? "grid-rows-[0fr] md:grid-rows-[1fr]" : "grid-rows-[1fr]"}`}>
        <div className="overflow-hidden">
          <div
            className={`pinly-map-panel-scroll md:max-h-none md:overflow-visible space-y-5 md:space-y-0 pr-1 md:pr-0 ${collapsed ? "" : "mt-4 md:mt-5"}`}
            style={mobileScrollStyle}
          >
            <div>
              <p className="text-sm font-semibold">Who visited</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cityContext.visitors.map((visitor) => (
                  <ProfileLink
                    key={visitor.id}
                    username={visitor.username}
                    className="flex min-h-11 items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-2 transition hover:bg-[var(--surface-strong)]"
                  >
                    <Avatar name={visitor.name} src={visitor.avatarUrl} className="h-7 w-7" />
                    <span className="text-sm">{visitor.name}</span>
                  </ProfileLink>
                ))}
              </div>
            </div>

            <div className="mt-5 md:mt-5">
              <p className="text-sm font-semibold">Recent trips</p>
              <div className="mt-3 space-y-3">
                {cityContext.recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openPost(trip.id)}
                    onKeyDown={(event) => handlePostKeyDown(event, trip.id)}
                    className="flex cursor-pointer items-start gap-3 rounded-[1.35rem] border bg-[var(--surface-soft)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--map-accent)]/40"
                  >
                    <ProfileLink username={trip.user.username} className="shrink-0 rounded-full">
                      <Avatar name={trip.user.name} src={trip.user.avatarUrl} className="h-8 w-8" />
                    </ProfileLink>
                    <div className="min-w-0">
                      <ProfileLink
                        username={trip.user.username}
                        className="rounded-md px-0.5 -ml-0.5 text-sm font-medium transition hover:text-[var(--foreground)]"
                      >
                        {trip.user.name}
                      </ProfileLink>
                      <p className="mt-1 text-sm text-[var(--foreground)]/68">{trip.placeName}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
                        <MapPin className="h-3.5 w-3.5 text-[var(--map-accent)]" />
                        {formatVisitDate(trip.visitedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
