import Link from "next/link";
import { MapPin } from "lucide-react";
import type { CityContext } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { formatVisitDate } from "@/lib/utils";

export function CityContextPanel({ cityContext }: { cityContext: CityContext | null }) {
  if (!cityContext) {
    return null;
  }

  return (
    <div className="glass-panel w-full max-w-md rounded-[2rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">City context</p>
      <h2 className="mt-2 font-[var(--font-serif)] text-3xl">
        {cityContext.city}, {cityContext.country}
      </h2>
      <p className="mt-2 text-sm text-[var(--foreground)]/62">{cityContext.friendCount} friends visited here</p>

      <div className="mt-5">
        <p className="text-sm font-semibold">Who visited</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {cityContext.visitors.map((visitor) => (
            <div key={visitor.id} className="flex items-center gap-2 rounded-full border bg-white/70 px-3 py-2">
              <Avatar name={visitor.name} src={visitor.avatarUrl} className="h-7 w-7" />
              <span className="text-sm">{visitor.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold">Recent trips</p>
        <div className="mt-3 space-y-3">
          {cityContext.recentTrips.map((trip) => (
            <Link key={trip.id} href={`/posts/${trip.id}`} className="flex items-start gap-3 rounded-3xl border bg-white/70 p-3">
              <Avatar name={trip.user.name} src={trip.user.avatarUrl} className="h-8 w-8" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{trip.user.name}</p>
                <p className="mt-1 text-sm text-[var(--foreground)]/68">{trip.placeName}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-[var(--foreground)]/45">
                  <MapPin className="h-3.5 w-3.5" />
                  {formatVisitDate(trip.visitedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
