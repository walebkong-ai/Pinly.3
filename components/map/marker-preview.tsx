import { ChevronRight, MapPin, ZoomIn } from "lucide-react";
import type { MapMarker, PostSummary } from "@/types/app";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MediaView } from "@/components/post/media-view";
import { formatVisitDate } from "@/lib/utils";

export function MarkerPreview({
  marker,
  onExpandPost,
  onZoomIn
}: {
  marker: MapMarker;
  onExpandPost: (post: PostSummary) => void;
  onZoomIn: () => void;
}) {
  if (marker.type === "cityCluster") {
    return (
      <div className="w-56 space-y-3 rounded-2xl border bg-[var(--surface-strong)] p-3 shadow-xl backdrop-blur-xl">
        <div>
          <p className="font-semibold">
            {marker.city}, {marker.country}
          </p>
          <p className="mt-1 text-xs text-[var(--foreground)]/54">
            {marker.postCount} memories · {marker.friendCount} friends
          </p>
        </div>
        <div className="flex -space-x-2">
          {marker.visitors.map((visitor) => (
            <Avatar key={visitor.id} name={visitor.name} src={visitor.avatarUrl} className="h-8 w-8 border-2 border-[var(--surface-strong)]" />
          ))}
        </div>
        <Button className="w-full justify-between bg-[var(--map-accent)] text-[var(--foreground)] focus:ring-[var(--map-accent)]" onClick={onZoomIn}>
          Explore city
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (marker.type === "placeCluster") {
    return (
      <div className="w-60 space-y-3 rounded-2xl border bg-[var(--surface-strong)] p-3 shadow-xl backdrop-blur-xl">
        <div>
          <p className="font-semibold">{marker.placeName}</p>
          <p className="mt-1 text-xs text-[var(--foreground)]/54">
            {marker.city}, {marker.country}
          </p>
        </div>
        <p className="text-sm text-[var(--foreground)]/76">{marker.postCount} moments pinned here</p>
        <Button className="w-full justify-between bg-[var(--map-accent)] text-[var(--foreground)] focus:ring-[var(--map-accent)]" onClick={onZoomIn}>
          Zoom to split
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const post = marker.post;
  const primaryCaption = post.caption.trim() || `Memory from ${post.placeName}`;

  return (
    <div className="w-60 overflow-hidden rounded-2xl border bg-[var(--surface-strong)] shadow-2xl shadow-black/20 backdrop-blur-xl">
      {/* image — no padding so it butts to the card edge */}
      <div className="aspect-[4/3] overflow-hidden">
        <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
      </div>
      {/* text content */}
      <div className="space-y-3 p-3">
        <p className="line-clamp-3 font-[var(--font-serif)] text-base leading-snug text-[var(--foreground)]">
          {primaryCaption}
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--foreground)]/56">
          <span className="inline-flex items-center gap-1 rounded-full border bg-[var(--surface-soft)] px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--map-accent)]" />
            <span className="truncate">
              {post.placeName}, {post.city}, {post.country}
            </span>
          </span>
          <span className="inline-flex items-center rounded-full border bg-[var(--surface-soft)] px-2.5 py-1 uppercase tracking-[0.14em] text-[var(--foreground)]/48">
            {formatVisitDate(post.visitedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-tight text-[var(--foreground)]/82">{post.user.name}</p>
            <p className="truncate text-[11px] text-[var(--foreground)]/48">@{post.user.username}</p>
          </div>
        </div>
        <Button className="w-full justify-between" onClick={() => onExpandPost(post)}>
          Expand memory
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
