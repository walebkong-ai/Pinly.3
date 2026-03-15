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
      <div className="w-56 space-y-3">
        <div>
          <p className="font-semibold">
            {marker.city}, {marker.country}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {marker.postCount} memories · {marker.friendCount} friends
          </p>
        </div>
        <div className="flex -space-x-2">
          {marker.visitors.map((visitor) => (
            <Avatar key={visitor.id} name={visitor.name} src={visitor.avatarUrl} className="h-8 w-8 border-2 border-white" />
          ))}
        </div>
        <Button className="w-full justify-between" onClick={onZoomIn}>
          Explore city
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (marker.type === "placeCluster") {
    return (
      <div className="w-60 space-y-3">
        <div>
          <p className="font-semibold">{marker.placeName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {marker.city}, {marker.country}
          </p>
        </div>
        <p className="text-sm text-slate-700">{marker.postCount} moments pinned here</p>
        <Button className="w-full justify-between" onClick={onZoomIn}>
          Zoom to split
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const post = marker.post;

  return (
    <div className="w-64 space-y-3">
      <div className="aspect-square overflow-hidden rounded-2xl">
        <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-8 w-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{post.user.name}</p>
          <p className="truncate text-xs text-slate-500">@{post.user.username}</p>
        </div>
      </div>
      <div>
        <p className="font-medium">{post.placeName}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {post.city}, {post.country}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-slate-700">{post.caption}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">{formatVisitDate(post.visitedAt)}</p>
      </div>
      <Button className="w-full justify-between" onClick={() => onExpandPost(post)}>
        Expand memory
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
