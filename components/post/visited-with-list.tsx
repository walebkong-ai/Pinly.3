import { Fragment } from "react";
import { Users } from "lucide-react";
import type { UserSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile/profile-link";

function renderFriendLinks(friends: UserSummary[]) {
  return friends.map((friend, index) => (
    <Fragment key={friend.id}>
      {index > 0 ? (
        <span>{index === friends.length - 1 ? (friends.length === 2 ? " and " : ", and ") : ", "}</span>
      ) : null}
      <ProfileLink username={friend.username} className="rounded-md px-0.5 transition hover:text-[var(--foreground)]">
        {friend.name}
      </ProfileLink>
    </Fragment>
  ));
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
            <ProfileLink key={friend.id} username={friend.username} className="rounded-full">
              <Avatar
                name={friend.name}
                src={friend.avatarUrl}
                className="h-6 w-6 border-2 border-[var(--surface-soft)]"
              />
            </ProfileLink>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-[var(--foreground)]">Visited with </span>
          <span className="truncate">{renderFriendLinks(friends)}</span>
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
            Shared this memory with {renderFriendLinks(friends)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {friends.map((friend) => (
              <ProfileLink
                key={friend.id}
                username={friend.username}
                className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
              >
                <Avatar name={friend.name} src={friend.avatarUrl} className="h-6 w-6" />
                <span>{friend.name}</span>
              </ProfileLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
