import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";
import { DeletePostButton } from "@/components/post/delete-post-button";
import { BackButton } from "@/components/post/back-button";

type Props = {
  params: Promise<{ postId: string }>;
};

export default async function PostDetailPage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { postId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <BackButton />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel rounded-[2rem] p-5">
        <div className="aspect-[16/10] overflow-hidden rounded-[1.75rem]">
          <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
        </div>
      </section>
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={post.user.name} src={post.user.avatarUrl} />
            <div>
              <p className="font-medium">{post.user.name}</p>
              <p className="text-sm text-[var(--foreground)]/58">@{post.user.username}</p>
            </div>
          </div>
          {session.user.id === post.userId && (
            <DeletePostButton postId={post.id} redirectToMap />
          )}
        </div>
        <h1 className="mt-6 font-[var(--font-serif)] text-4xl">{post.placeName}</h1>
        <div className="mt-4 flex items-start gap-2 text-[var(--foreground)]/68">
          <MapPin className="mt-1 h-4 w-4 text-[var(--accent)]" />
          <div>
            <p>
              {post.city}, {post.country}
            </p>
            <p className="text-sm">Visited {formatVisitDate(post.visitedAt)}</p>
          </div>
        </div>
        <p className="mt-6 text-base leading-8 text-[var(--foreground)]/76">{post.caption}</p>
        <div className="mt-8 rounded-[1.75rem] border bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/45">Coordinates</p>
          <p className="mt-2 text-sm">
            {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
          </p>
        </div>
      </section>
      </div>
    </div>
  );
}
