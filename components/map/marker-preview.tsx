import { ChevronRight, MapPin, X, ZoomIn } from "lucide-react";
import type { SyntheticEvent } from "react";
import type { MapMarker, PostSummary } from "@/types/app";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LocationCountryText } from "@/components/ui/country-flag";
import { MediaView } from "@/components/post/media-view";
import { ProfileLink } from "@/components/profile/profile-link";
import { formatVisitDate } from "@/lib/utils";

export function MarkerPreview({
  marker,
  onExpandPost,
  onZoomIn,
  onClosePreview
}: {
  marker: MapMarker;
  onExpandPost: (post: PostSummary) => void;
  onZoomIn: () => void;
  onClosePreview: () => void;
}) {
  function handleClose(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    onClosePreview();
  }

  if (marker.type === "cityCluster") {
    return (
      <div className="relative w-56 space-y-3 rounded-2xl border bg-[var(--surface-strong)] p-3 shadow-xl backdrop-blur-xl">
        <Button
          variant="ghost"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full bg-[rgba(24,85,56,0.82)] p-0 text-[var(--background)] hover:bg-[rgba(24,85,56,0.96)] hover:text-[var(--background)]"
          onPointerDown={handleClose}
          onClick={handleClose}
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
        <div>
          <LocationCountryText city={marker.city} country={marker.country} className="w-full min-w-0 font-semibold" />
          <p className="mt-1 text-xs text-[var(--foreground)]/54">
            {marker.postCount} memories · {marker.friendCount} friends
          </p>
        </div>
        <div className="flex -space-x-2">
          {marker.visitors.map((visitor) => (
            <ProfileLink key={visitor.id} username={visitor.username} className="rounded-full">
              <Avatar name={visitor.name} src={visitor.avatarUrl} className="h-8 w-8 border-2 border-[var(--surface-strong)]" />
            </ProfileLink>
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
      <div className="relative w-60 space-y-3 rounded-2xl border bg-[var(--surface-strong)] p-3 shadow-xl backdrop-blur-xl">
        <Button
          variant="ghost"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full bg-[rgba(24,85,56,0.82)] p-0 text-[var(--background)] hover:bg-[rgba(24,85,56,0.96)] hover:text-[var(--background)]"
          onPointerDown={handleClose}
          onClick={handleClose}
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-semibold">{marker.placeName}</p>
          <LocationCountryText
            city={marker.city}
            country={marker.country}
            className="mt-1 w-full min-w-0 text-xs text-[var(--foreground)]/54"
          />
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
    <div className="relative w-60 overflow-hidden rounded-2xl border bg-[var(--surface-strong)] shadow-2xl shadow-black/20 backdrop-blur-xl">
      <Button
        variant="ghost"
        className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full bg-[rgba(24,85,56,0.82)] p-0 text-[var(--background)] hover:bg-[rgba(24,85,56,0.96)] hover:text-[var(--background)]"
        onPointerDown={handleClose}
        onClick={handleClose}
        aria-label="Close preview"
      >
        <X className="h-4 w-4" />
      </Button>
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
            <span className="flex min-w-0 max-w-full items-center gap-1 truncate">
              <span className="truncate">{post.placeName},</span>
              <LocationCountryText city={post.city} country={post.country} className="min-w-0 max-w-full" />
            </span>
          </span>
          <span className="inline-flex items-center rounded-full border bg-[var(--surface-soft)] px-2.5 py-1 uppercase tracking-[0.14em] text-[var(--foreground)]/48">
            {formatVisitDate(post.visitedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProfileLink
            username={post.user.username}
            className="flex min-w-0 items-center gap-2 rounded-2xl p-1 -m-1 transition hover:bg-[var(--surface-soft)]"
          >
            <Avatar name={post.user.name} src={post.user.avatarUrl} className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium leading-tight text-[var(--foreground)]/82">{post.user.name}</p>
              <p className="truncate text-[11px] text-[var(--foreground)]/48">@{post.user.username}</p>
            </div>
          </ProfileLink>
        </div>
        <Button
          className="w-full justify-between bg-[var(--map-accent)] text-[var(--foreground)] hover:opacity-95 focus:ring-[var(--map-accent)]"
          onClick={() => onExpandPost(post)}
        >
          Expand memory
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
