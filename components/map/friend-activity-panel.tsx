import Link from "next/link";
import type { FriendActivityItem, LayerMode } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { formatVisitDate } from "@/lib/utils";

export function FriendActivityPanel({
  items,
  layer
}: {
  items: FriendActivityItem[];
  layer: LayerMode;
}) {
  return (
    <div className="glass-panel w-full max-w-sm rounded-[2rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Friend activity</p>
      <h2 className="mt-2 font-[var(--font-serif)] text-3xl">Recent nearby memories</h2>
      <div className="mt-4 space-y-3">
        {layer === "you" && (
          <div className="rounded-3xl border bg-white/60 p-4 text-sm text-[var(--foreground)]/62">
            Switch the layer to <span className="font-medium text-[var(--foreground)]">Friends</span> or{" "}
            <span className="font-medium text-[var(--foreground)]">Both</span> to see social activity.
          </div>
        )}
        {layer !== "you" && !items.length && (
          <div className="rounded-3xl border bg-white/60 p-4 text-sm text-[var(--foreground)]/62">
            No recent friend memories inside this map view yet.
          </div>
        )}
        {layer !== "you" &&
          items.map((item) => (
            <Link key={item.id} href={`/posts/${item.postId}`} className="flex items-center gap-3 rounded-3xl border bg-white/72 p-3">
              <Avatar name={item.user.name} src={item.user.avatarUrl} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.user.name}</p>
                <p className="truncate text-sm text-[var(--foreground)]/64">
                  {item.placeName}, {item.city}
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/42">
                  {formatVisitDate(item.visitedAt)}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
