import Image from "next/image";
import Link from "next/link";
import { Archive, Bookmark, Folders, ImageOff, MapPinned, Settings2 } from "lucide-react";
import type { CollectionSummary, PostSummary, ProfileTravelSummary } from "@/types/app";
import type { RelationshipDetails } from "@/lib/relationships";
import { getMediaProxyUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PostCard } from "@/components/post/post-card";
import { EditProfile } from "@/components/profile/edit-profile";
import { MessageFriendButton } from "@/components/messages/message-friend-button";
import { ProfileActions } from "@/components/profile/profile-actions";
import { CollectionCard } from "@/components/collections/collection-card";
import { CreateCollectionButton } from "@/components/collections/create-collection-button";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { LocationCountryText } from "@/components/ui/country-flag";
import { resolveCountry } from "@/lib/country-flags";

function buildProfilePlaceKey(post: Pick<PostSummary, "city" | "country">) {
  const resolvedCountry = resolveCountry(post.country);
  const countryKey = resolvedCountry.code ?? resolvedCountry.name.trim().toLowerCase();
  return `${post.city.trim().toLowerCase()}|${countryKey}`;
}

function getUniqueProfilePlaces(posts: PostSummary[]) {
  const uniquePlaces = new Map<string, { key: string; city: string; country: string }>();

  for (const post of posts) {
    const key = buildProfilePlaceKey(post);

    if (!uniquePlaces.has(key)) {
      uniquePlaces.set(key, {
        key,
        city: post.city,
        country: post.country
      });
    }
  }

  return Array.from(uniquePlaces.values());
}

export function ProfileView({
  profile,
  isOwnProfile,
  showLikeCounts = true,
  collections = [],
  relationship
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
    travelSummary: ProfileTravelSummary;
  };
  isOwnProfile: boolean;
  showLikeCounts?: boolean;
  collections?: CollectionSummary[];
  relationship: RelationshipDetails;
}) {
  const uniquePlaces = getUniqueProfilePlaces(profile.posts);
  const visiblePlaces = uniquePlaces.slice(0, 8);
  const hiddenPlaceCount = Math.max(uniquePlaces.length - visiblePlaces.length, 0);
  const firstName = profile.user.name.split(" ")[0] || profile.user.name;
  const summaryDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  });

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
                  href="/want-to-go"
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,159,28,0.2)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[rgba(255,159,28,0.18)]"
                >
                  <MapPinned className="h-4 w-4 text-[var(--accent)]" />
                  Want to go
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Link>
                <Link
                  href="/archived"
                  className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  <Archive className="h-4 w-4" />
                  Archived
                </Link>
                <p className="text-xs text-[var(--foreground)]/55">Likes, comments, archived posts, and profile photo.</p>
              </div>
              <InstallAppCard className="mt-4 max-w-xl" />
            </div>
          ) : (
            <div className="flex items-center gap-4 min-w-0">
              <Avatar name={profile.user.name} src={profile.user.avatarUrl} className="h-16 w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">
                  {relationship.status === "friends" ? "Friend profile" : "Profile"}
                </p>
                <h1 className="mt-1 font-[var(--font-serif)] text-3xl md:text-4xl truncate">{profile.user.name}</h1>
                <p className="text-sm text-[var(--foreground)]/62 truncate">@{profile.user.username}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ProfileActions
                    username={profile.user.username}
                    relationship={relationship}
                  />
                  {relationship.status === "friends" ? (
                    <MessageFriendButton
                      friendId={profile.user.id}
                      label="Message"
                      variant="secondary"
                      className="h-10 px-4"
                    />
                  ) : null}
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
              <p className="text-2xl font-semibold">{profile.travelSummary.cityCount}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Cities</p>
            </div>
            <div className="rounded-3xl border bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-2xl font-semibold">{profile.travelSummary.countryCount}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Countries</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {visiblePlaces.map((place) => (
            <span
              key={place.key}
              className="rounded-full border bg-[var(--surface-soft)] px-3 py-1 text-sm text-[var(--foreground)]/68"
            >
              <LocationCountryText city={place.city} country={place.country} className="max-w-[12rem] sm:max-w-full" />
            </span>
          ))}
          {hiddenPlaceCount > 0 ? (
            <span className="rounded-full border bg-[var(--surface-soft)] px-3 py-1 text-sm text-[var(--foreground)]/52">
              +{hiddenPlaceCount} more
            </span>
          ) : null}
        </div>
      </section>

      {!isOwnProfile && profile.posts.length > 0 ? (
        <section className="glass-panel rounded-[2rem] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Travel summary</p>
          <h2 className="mt-1.5 text-2xl font-semibold">{firstName}&apos;s travel footprint</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/62">
            A quick look at where they&apos;ve pinned memories lately, without turning the profile into a stats dashboard.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Recent places</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.travelSummary.recentPlaces.map((place) => (
                  <span
                    key={`${place.placeName}-${place.city}-${place.country}`}
                    className="rounded-full border bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)]/72"
                  >
                    {place.placeName}, {place.city}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">
                {profile.travelSummary.sharedPlaces.length > 0 ? "Overlap with you" : "Shared places"}
              </p>
              {profile.travelSummary.sharedPlaces.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.travelSummary.sharedPlaces.map((place) => (
                    <span
                      key={`${place.city}-${place.country}`}
                      className="rounded-full border border-[rgba(56,182,201,0.18)] bg-[rgba(56,182,201,0.08)] px-3 py-1.5 text-sm text-[var(--foreground)]/74"
                    >
                      <LocationCountryText city={place.city} country={place.country} className="max-w-[12rem] sm:max-w-full" />
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--foreground)]/58">
                  No overlapping places yet, but this will light up when you&apos;ve both pinned the same city.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Recent memories</p>
            <div className="mt-3 space-y-3">
              {profile.travelSummary.recentMemories.map((memory) => (
                <Link
                  key={memory.id}
                  href={`/posts/${memory.id}`}
                  className="group flex items-center gap-3 rounded-[1.25rem] border bg-[var(--surface-strong)] p-3 transition hover:bg-[var(--card-strong)]"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-soft)]">
                    {getMediaProxyUrl(memory.thumbnailUrl ?? memory.mediaUrl) ? (
                      <Image
                        src={getMediaProxyUrl(memory.thumbnailUrl ?? memory.mediaUrl)}
                        alt={memory.placeName}
                        fill
                        sizes="56px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--foreground)]/45">
                        <ImageOff className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-serif)] text-[0.98rem] leading-snug text-[var(--foreground)]">
                      {memory.caption.trim() || `Memory from ${memory.placeName}`}
                    </p>
                    <div className="mt-1 flex min-w-0 max-w-full items-center gap-1 text-xs text-[var(--foreground)]/56">
                      <span className="truncate">{memory.placeName},</span>
                      <LocationCountryText city={memory.city} country={memory.country} className="min-w-0 max-w-full" />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--foreground)]/43">
                      {summaryDateFormatter.format(new Date(memory.visitedAt))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
        {profile.posts.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profile.posts.map((post) => (
              <PostCard key={post.id} post={post} showLikeCounts={showLikeCounts} />
            ))}
          </div>
        ) : isOwnProfile ? (
          <div className="mt-5 rounded-[1.75rem] border bg-[var(--surface-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Start here</p>
            <h3 className="mt-1.5 font-[var(--font-serif)] text-2xl">Your first memory will show up here.</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/62">
              Create one post to start shaping your personal map, then add friends so your circle can see it too.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-95"
              >
                Create your first memory
              </Link>
              <Link
                href="/friends"
                className="inline-flex items-center justify-center rounded-full border bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                Add friends
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.75rem] border bg-[var(--surface-soft)] p-5 text-sm text-[var(--foreground)]/60">
            No pinned moments here yet.
          </div>
        )}
      </section>
    </div>
  );
}
