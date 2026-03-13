import type { PostSummary } from "@/types/app";
import { Avatar } from "@/components/ui/avatar";
import { PostCard } from "@/components/post/post-card";

export function ProfileView({
  profile,
  isOwnProfile
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
}) {
  return (
    <div className="grid gap-4">
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={profile.user.name} src={profile.user.avatarUrl} className="h-16 w-16" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">
                {isOwnProfile ? "Your profile" : "Friend profile"}
              </p>
              <h1 className="mt-1 font-[var(--font-serif)] text-4xl">{profile.user.name}</h1>
              <p className="text-sm text-[var(--foreground)]/62">@{profile.user.username}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-3xl border bg-white/72 px-4 py-3">
              <p className="text-2xl font-semibold">{profile.posts.length}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Posts</p>
            </div>
            <div className="rounded-3xl border bg-white/72 px-4 py-3">
              <p className="text-2xl font-semibold">{profile.places.length}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Places</p>
            </div>
            <div className="rounded-3xl border bg-white/72 px-4 py-3">
              <p className="text-2xl font-semibold">{new Set(profile.posts.map((post) => post.country)).size}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">Countries</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {profile.places.map((place) => (
            <span key={place} className="rounded-full border bg-white/70 px-3 py-1 text-sm text-[var(--foreground)]/68">
              {place}
            </span>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-5">
        <h2 className="text-2xl font-semibold">Pinned moments</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profile.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
