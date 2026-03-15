import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRecentFeedPosts } from "@/lib/data";
import { PostCard } from "@/components/post/post-card";

export default async function FeedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const posts = await getRecentFeedPosts(session.user.id, 24);

  return (
    <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <section className="glass-panel rounded-[2rem] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Feed</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-4xl">Recent memories from your circle</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--foreground)]/66">
          The feed is secondary to the map, but it is useful when you want a quick scroll through the latest trips.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
