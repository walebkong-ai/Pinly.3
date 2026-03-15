import { Users } from "lucide-react";
import type { UserSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";

function formatNames(friends: UserSummary[]) {
  if (friends.length === 0) {
    return "";
  }

  if (friends.length === 1) {
    return friends[0].name;
  }

  if (friends.length === 2) {
    return `${friends[0].name} and ${friends[1].name}`;
  }

  return `${friends[0].name}, ${friends[1].name}, +${friends.length - 2} more`;
}

export function VisitedWithList({
  friends,
  compact = false
}: {
  friends?: UserSummary[];
  compact?: boolean;
}) {
  if (!friends?.length) {
    return null;
  }

  if (compact) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground)]/72">
        <div className="flex -space-x-2">
          {friends.slice(0, 3).map((friend) => (
            <Avatar
              key={friend.id}
              name={friend.name}
              src={friend.avatarUrl}
              className="h-6 w-6 border-2 border-[var(--surface-soft)]"
            />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-[var(--foreground)]">Visited with </span>
          <span className="truncate">{formatNames(friends)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[rgba(255,95,162,0.18)] bg-[rgba(255,95,162,0.08)] p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--social-accent-soft)] text-[var(--social-accent)]">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Visited with</p>
          <p className="mt-1 text-sm text-[var(--foreground)]/72">
            Shared this memory with {formatNames(friends)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {friends.map((friend) => (
              <span
                key={friend.id}
                className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)]"
              >
                <Avatar name={friend.name} src={friend.avatarUrl} className="h-6 w-6" />
                <span>{friend.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
