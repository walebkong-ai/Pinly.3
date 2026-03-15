"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import type { CityContext } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { formatVisitDate } from "@/lib/utils";

export function CityContextPanel({ cityContext }: { cityContext: CityContext | null }) {
  const [collapsed, setCollapsed] = useState(true);
  if (!cityContext) {
    return null;
  }

  return (
    <div 
      className={`glass-panel w-full max-w-md transition-all ${
        collapsed ? "rounded-full p-2 px-4 md:rounded-[2rem] md:p-4" : "rounded-3xl p-3 md:rounded-[2rem] md:p-4"
      }`}
    >
      <button 
        onClick={() => setCollapsed(!collapsed)} 
        className="flex w-full items-center justify-between text-left"
        type="button"
      >
        <div className={collapsed ? "flex items-center gap-2 md:block" : ""}>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45 select-none">City context</p>
          <h2 className={`font-[var(--font-serif)] text-xl md:text-3xl md:mt-2 ${collapsed ? "hidden md:block" : "mt-1 block"}`}>
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
          <div className={`max-h-[35vh] md:max-h-none overflow-y-auto md:overflow-visible space-y-5 md:space-y-0 pr-1 md:pr-0 ${collapsed ? "" : "mt-4 md:mt-5"}`}>
            <div>
              <p className="text-sm font-semibold">Who visited</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cityContext.visitors.map((visitor) => (
                  <div key={visitor.id} className="flex items-center gap-2 rounded-full border bg-[var(--surface-soft)] px-3 py-2">
                    <Avatar name={visitor.name} src={visitor.avatarUrl} className="h-7 w-7" />
                    <span className="text-sm">{visitor.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 md:mt-5">
              <p className="text-sm font-semibold">Recent trips</p>
              <div className="mt-3 space-y-3">
                {cityContext.recentTrips.map((trip) => (
                  <Link key={trip.id} href={`/posts/${trip.id}`} className="flex items-start gap-3 rounded-3xl border bg-[var(--surface-soft)] p-3">
                    <Avatar name={trip.user.name} src={trip.user.avatarUrl} className="h-8 w-8" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{trip.user.name}</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]/68">{trip.placeName}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
                        <MapPin className="h-3.5 w-3.5 text-[var(--map-accent)]" />
                        {formatVisitDate(trip.visitedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
