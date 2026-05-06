export const POST_MEDIA_ASPECT_RATIOS = ["1:1", "3:4", "4:5", "1.91:1"] as const;

export type PostMediaAspectRatio = (typeof POST_MEDIA_ASPECT_RATIOS)[number];

export type PostMediaDisplayMetadata = {
  mediaAspectRatio?: PostMediaAspectRatio | string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
};

export type PostMediaFrameDefinition = {
  value: PostMediaAspectRatio;
  label: string;
  shortLabel: string;
  ratio: number;
  outputWidth: number;
  outputHeight: number;
};

export const POST_MEDIA_FRAME_DEFINITIONS: PostMediaFrameDefinition[] = [
  {
    value: "1:1",
    label: "Square",
    shortLabel: "1:1",
    ratio: 1,
    outputWidth: 1080,
    outputHeight: 1080
  },
  {
    value: "3:4",
    label: "Portrait",
    shortLabel: "3:4",
    ratio: 3 / 4,
    outputWidth: 1080,
    outputHeight: 1440
  },
  {
    value: "4:5",
    label: "Standard",
    shortLabel: "4:5",
    ratio: 4 / 5,
    outputWidth: 1080,
    outputHeight: 1350
  },
  {
    value: "1.91:1",
    label: "Landscape",
    shortLabel: "1.91:1",
    ratio: 1.91,
    outputWidth: 1080,
    outputHeight: 566
  }
];

export const DEFAULT_POST_MEDIA_ASPECT_RATIO: PostMediaAspectRatio = "4:5";
export const LEGACY_POST_MEDIA_ASPECT_RATIO = 4 / 3;

export function isPostMediaAspectRatio(value: unknown): value is PostMediaAspectRatio {
  return typeof value === "string" && POST_MEDIA_ASPECT_RATIOS.includes(value as PostMediaAspectRatio);
}

export function getPostMediaFrameDefinition(value: unknown) {
  return POST_MEDIA_FRAME_DEFINITIONS.find((definition) => definition.value === value);
}

export function getPostMediaAspectRatioValue(metadata: PostMediaDisplayMetadata | null | undefined) {
  const frame = getPostMediaFrameDefinition(metadata?.mediaAspectRatio);

  if (frame) {
    return frame.ratio;
  }

  if (metadata?.mediaWidth && metadata.mediaHeight && metadata.mediaWidth > 0 && metadata.mediaHeight > 0) {
    return metadata.mediaWidth / metadata.mediaHeight;
  }

  return LEGACY_POST_MEDIA_ASPECT_RATIO;
}

export function getPostMediaAspectRatioStyle(metadata: PostMediaDisplayMetadata | null | undefined) {
  return `${getPostMediaAspectRatioValue(metadata)} / 1`;
}

export function getInitialPostMediaAspectRatioForImage(width: number, height: number): PostMediaAspectRatio {
  if (!width || !height) {
    return DEFAULT_POST_MEDIA_ASPECT_RATIO;
  }

  const ratio = width / height;

  if (Math.abs(ratio - 1) <= 0.04) {
    return "1:1";
  }

  if (ratio > 1) {
    return "1.91:1";
  }

  return ratio <= 0.775 ? "3:4" : "4:5";
}
