import Link from "next/link";
import { Bookmark, Folders, Settings2 } from "lucide-react";
import type { CollectionSummary, PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { PostCard } from "@/components/post/post-card";
import { EditProfile } from "@/components/profile/edit-profile";
import { MessageFriendButton } from "@/components/messages/message-friend-button";
import { CollectionCard } from "@/components/collections/collection-card";
import { CreateCollectionButton } from "@/components/collections/create-collection-button";

export function ProfileView({
  profile,
  isOwnProfile,
  showLikeCounts = true,
  collections = []
}: {
  profile: {
    user: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
      createdAt: string | Date;
    };
    posts: PostSummary[];
    places: string[];
  };
  isOwnProfile: boolean;
  showLikeCounts?: boolean;
  collections?: CollectionSummary[];
}) {
  return (
    <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          {isOwnProfile ? (
            <div className="flex-1">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">
                Your profile
              </p>
              <EditProfile
                initialName={profile.user.name}
                initialUsername={profile.user.username}
                initialAvatarUrl={profile.user.avatarUrl}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href="/saved"
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,95,162,0.2)] bg-[var(--social-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[rgba(255,95,162,0.16)]"
                >
                  <Bookmark className="h-4 w-4 text-[var(--social-accent)]" />
                  Saved
                </Link>
                <Link
                  href="/collections"
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.08)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[rgba(56,182,201,0.14)]"
                >
                  <Folders className="h-4 w-4 text-[var(--map-accent)]" />
                  Collections
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Link>
                <p className="text-xs text-[var(--foreground)]/55">Likes, comments, and profile photo.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 min-w-0">
              <Avatar name={profile.user.name} src={profile.user.avatarUrl} className="h-16 w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">
                  Friend profile
                </p>
                <h1 className="mt-1 font-[var(--font-serif)] text-3xl md:text-4xl truncate">{profile.user.name}</h1>
                <p className="text-sm text-[var(--foreground)]/62 truncate">@{profile.user.username}</p>
                <div className="mt-3">
                  <MessageFriendButton
                    friendId={profile.user.id}
                    label="Message"
                    variant="secondary"
                    className="h-10 px-4"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-3xl border bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-2xl font-semibold">{profile.posts.length}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Posts</p>
            </div>
            <div className="rounded-3xl border bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-2xl font-semibold">{profile.places.length}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Places</p>
            </div>
            <div className="rounded-3xl border bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-2xl font-semibold">{new Set(profile.posts.map((post) => post.country)).size}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Countries</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {profile.places.map((place) => (
            <span key={place} className="rounded-full border bg-[var(--surface-soft)] px-3 py-1 text-sm text-[var(--foreground)]/68">
              {place}
            </span>
          ))}
        </div>
      </section>

      {isOwnProfile ? (
        <section className="glass-panel rounded-[2rem] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Trips & collections</p>
              <h2 className="mt-1.5 text-2xl font-semibold">Grouped memories</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/62">
                Organize your posts by trip, season, or any memory thread you want to revisit.
              </p>
            </div>
            <CreateCollectionButton label="New" className="px-4" />
          </div>

          {collections.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} compact />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--foreground)]/58">
                No folders yet. Create a collection, then add posts from the create flow or the full post view.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <section className="glass-panel rounded-[2rem] p-5">
        <h2 className="text-2xl font-semibold">Pinned moments</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profile.posts.map((post) => (
            <PostCard key={post.id} post={post} showLikeCounts={showLikeCounts} />
          ))}
        </div>
      </section>
    </div>
  );
}
