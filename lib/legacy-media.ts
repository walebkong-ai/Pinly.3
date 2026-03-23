const LEGACY_VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const LEGACY_PICSUM_HOSTS = new Set(["picsum.photos", "fastly.picsum.photos"]);
const LEGACY_DICEBEAR_HOST = "api.dicebear.com";
const LEGACY_MDN_VIDEO_HOST = "interactive-examples.mdn.mozilla.net";

const LEGACY_RENDERABLE_IMAGE_EXTENSIONS = new Set(["gif", "jpg", "jpeg", "png", "webp"]);
const LEGACY_RENDERABLE_VIDEO_EXTENSIONS = new Set(["mov", "mp4", "qt", "webm"]);
const LEGACY_HEIC_EXTENSIONS = new Set(["heic", "heif"]);

export type LegacyMediaRecordKind = "avatar" | "post";

export type LegacyMediaSourceCategory =
  | "dicebear_avatar"
  | "mdn_video"
  | "picsum_image"
  | "vercel_blob_heic"
  | "vercel_blob_image"
  | "vercel_blob_video";

export type LegacyMediaSource = {
  category: LegacyMediaSourceCategory;
  extension: string | null;
  host: string;
  originalUrl: string;
  renderUrl: string | null;
  suggestedContentType: string | null;
  uploadSourceUrl: string;
};

function normalizeHttpsUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());

    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return null;
    }

    parsed.hash = "";
    return parsed;
  } catch {
    return null;
  }
}

function normalizeRemoteUrl(parsed: URL) {
  const nextUrl = new URL(parsed.toString());
  nextUrl.hash = "";
  return nextUrl.toString();
}

function getPathExtension(pathname: string) {
  const lastSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const extension = lastSegment.includes(".") ? lastSegment.split(".").at(-1) ?? "" : "";
  const normalized = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized || null;
}

function isDicebearAvatarPath(pathname: string) {
  return /^\/9\.x\/thumbs\/(?:png|svg)$/i.test(pathname);
}

function isPicsumSeedPath(pathname: string) {
  return /^\/seed\/[a-z0-9-]+\/\d+\/\d+$/i.test(pathname);
}

function isMdnVideoPath(pathname: string) {
  return /^\/media\/cc0-videos\/[a-z0-9._-]+\.mp4$/i.test(pathname);
}

function inferContentTypeFromExtension(extension: string | null) {
  switch (extension) {
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "mov":
    case "qt":
      return "video/quicktime";
    case "mp4":
      return "video/mp4";
    case "png":
      return "image/png";
    case "webm":
      return "video/webm";
    case "webp":
      return "image/webp";
    case "heic":
    case "heif":
      return "image/heic";
    default:
      return null;
  }
}

export function classifyLegacyMediaUrl(
  value: string | null | undefined,
  kind: LegacyMediaRecordKind
): LegacyMediaSource | null {
  const parsed = normalizeHttpsUrl(value);

  if (!parsed) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const normalizedUrl = normalizeRemoteUrl(parsed);
  const extension = getPathExtension(parsed.pathname);

  if (host.endsWith(LEGACY_VERCEL_BLOB_HOST_SUFFIX) && parsed.pathname.startsWith("/uploads/") && !parsed.search) {
    if (extension && LEGACY_RENDERABLE_IMAGE_EXTENSIONS.has(extension)) {
      return {
        category: "vercel_blob_image",
        extension,
        host,
        originalUrl: normalizedUrl,
        renderUrl: normalizedUrl,
        suggestedContentType: inferContentTypeFromExtension(extension),
        uploadSourceUrl: normalizedUrl
      };
    }

    if (kind === "post" && extension && LEGACY_RENDERABLE_VIDEO_EXTENSIONS.has(extension)) {
      return {
        category: "vercel_blob_video",
        extension,
        host,
        originalUrl: normalizedUrl,
        renderUrl: normalizedUrl,
        suggestedContentType: inferContentTypeFromExtension(extension),
        uploadSourceUrl: normalizedUrl
      };
    }

    if (kind === "post" && extension && LEGACY_HEIC_EXTENSIONS.has(extension)) {
      return {
        category: "vercel_blob_heic",
        extension,
        host,
        originalUrl: normalizedUrl,
        renderUrl: null,
        suggestedContentType: inferContentTypeFromExtension(extension),
        uploadSourceUrl: normalizedUrl
      };
    }

    return null;
  }

  if (kind === "post" && LEGACY_PICSUM_HOSTS.has(host) && isPicsumSeedPath(parsed.pathname) && !parsed.search) {
    return {
      category: "picsum_image",
      extension: "jpg",
      host,
      originalUrl: normalizedUrl,
      renderUrl: normalizedUrl,
      suggestedContentType: "image/jpeg",
      uploadSourceUrl: normalizedUrl
    };
  }

  if (kind === "post" && host === LEGACY_MDN_VIDEO_HOST && isMdnVideoPath(parsed.pathname) && !parsed.search) {
    return {
      category: "mdn_video",
      extension: "mp4",
      host,
      originalUrl: normalizedUrl,
      renderUrl: normalizedUrl,
      suggestedContentType: "video/mp4",
      uploadSourceUrl: normalizedUrl
    };
  }

  if (kind === "avatar" && host === LEGACY_DICEBEAR_HOST && isDicebearAvatarPath(parsed.pathname) && parsed.searchParams.has("seed")) {
    const pngUrl = new URL(parsed.toString());
    pngUrl.pathname = "/9.x/thumbs/png";
    const normalizedPngUrl = normalizeRemoteUrl(pngUrl);

    return {
      category: "dicebear_avatar",
      extension: "png",
      host,
      originalUrl: normalizedUrl,
      renderUrl: normalizedPngUrl,
      suggestedContentType: "image/png",
      uploadSourceUrl: normalizedPngUrl
    };
  }

  return null;
}

export function normalizeLegacyRenderableMediaUrl(
  value: string | null | undefined,
  kind: LegacyMediaRecordKind
) {
  return classifyLegacyMediaUrl(value, kind)?.renderUrl ?? null;
}

export function isLegacyMediaUrlRecoverable(value: string | null | undefined, kind: LegacyMediaRecordKind) {
  return classifyLegacyMediaUrl(value, kind) !== null;
}
