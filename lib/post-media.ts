import { getMediaProxyUrl } from "@/lib/utils";

type MediaType = "IMAGE" | "VIDEO";
const POST_MEDIA_PLACEHOLDER_URL = "/logo.png";

export type ResolvedMediaViewUrls = {
  posterUrl: string;
  previewUrl: string;
  primarySource: "media" | "thumbnail" | null;
  primaryUrl: string;
};

function resolveRenderablePostUrl(url: string | null | undefined) {
  const resolvedUrl = getMediaProxyUrl(url);
  return resolvedUrl && resolvedUrl !== POST_MEDIA_PLACEHOLDER_URL ? resolvedUrl : "";
}

export function resolveMediaViewUrls({
  mediaType,
  mediaUrl,
  thumbnailUrl
}: {
  mediaType: MediaType;
  mediaUrl: string | null | undefined;
  thumbnailUrl?: string | null;
}): ResolvedMediaViewUrls {
  const mediaProxyUrl = resolveRenderablePostUrl(mediaUrl);
  const thumbnailProxyUrl = resolveRenderablePostUrl(thumbnailUrl);

  if (mediaType === "VIDEO") {
    return {
      primaryUrl: mediaProxyUrl,
      primarySource: mediaProxyUrl ? "media" : null,
      previewUrl: "",
      posterUrl: thumbnailProxyUrl
    };
  }

  const primaryUrl = mediaProxyUrl || thumbnailProxyUrl;
  const primarySource = mediaProxyUrl ? "media" : thumbnailProxyUrl ? "thumbnail" : null;
  const previewUrl =
    primaryUrl && thumbnailProxyUrl && thumbnailProxyUrl !== primaryUrl ? thumbnailProxyUrl : "";

  return {
    primaryUrl,
    primarySource,
    previewUrl,
    posterUrl: ""
  };
}
