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
      <div className="w-56 space-y-3 rounded-2xl border border-white/60 bg-[rgba(255,251,244,0.95)] p-3 shadow-xl backdrop-blur-xl">
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
      <div className="w-60 space-y-3 rounded-2xl border border-white/60 bg-[rgba(255,251,244,0.95)] p-3 shadow-xl backdrop-blur-xl">
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
    <div className="w-60 overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,251,244,0.96)] shadow-2xl shadow-black/20 backdrop-blur-xl">
      {/* image — no padding so it butts to the card edge */}
      <div className="aspect-[4/3] overflow-hidden">
        <MediaView mediaType={post.mediaType} mediaUrl={post.mediaUrl} thumbnailUrl={post.thumbnailUrl} />
      </div>
      {/* text content */}
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{post.user.name}</p>
            <p className="truncate text-xs text-slate-500">@{post.user.username}</p>
          </div>
        </div>
        <div>
          <p className="inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {post.city}, {post.country}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-700">{post.caption}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{formatVisitDate(post.visitedAt)}</p>
        </div>
        <Button className="w-full justify-between" onClick={() => onExpandPost(post)}>
          Expand memory
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
