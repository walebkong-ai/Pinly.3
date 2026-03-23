const TRUSTED_DEMO_MEDIA_PREFIX = "/demo-media";
const TRUSTED_DEMO_POST_MEDIA_PATTERN =
  /^\/demo-media\/posts\/[a-z0-9][a-z0-9/_-]*\.(?:avif|gif|jpe?g|png|webp)$/i;
const TRUSTED_DEMO_AVATAR_PATTERN =
  /^\/demo-media\/avatars\/[a-z0-9][a-z0-9/_-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

const BUNDLED_DEMO_POST_IMAGES = [
  "/demo-media/posts/circular-quay.jpg",
  "/demo-media/posts/old-port.jpg",
  "/demo-media/posts/paris-cafe.jpg",
  "/demo-media/posts/regents-canal.jpg",
  "/demo-media/posts/shibuya.jpg",
  "/demo-media/posts/washington-square.jpg"
] as const;

const BUNDLED_DEMO_AVATARS = [
  "/demo-media/avatars/avery.svg",
  "/demo-media/avatars/maya.svg",
  "/demo-media/avatars/noah.svg",
  "/demo-media/avatars/elena.svg",
  "/demo-media/avatars/leo.svg"
] as const;

const DEMO_AVATAR_BY_KEY = new Map<string, (typeof BUNDLED_DEMO_AVATARS)[number]>([
  ["avery", "/demo-media/avatars/avery.svg"],
  ["maya", "/demo-media/avatars/maya.svg"],
  ["noah", "/demo-media/avatars/noah.svg"],
  ["elena", "/demo-media/avatars/elena.svg"],
  ["leo", "/demo-media/avatars/leo.svg"]
]);

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeSeed(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isTrustedBundledDemoMediaPath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return TRUSTED_DEMO_POST_MEDIA_PATTERN.test(trimmed);
}

export function isTrustedBundledDemoAvatarPath(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return TRUSTED_DEMO_AVATAR_PATTERN.test(trimmed);
}

export function getBundledDemoPostImageUrl(seed: string) {
  const normalizedSeed = normalizeSeed(seed);

  if (!normalizedSeed) {
    return BUNDLED_DEMO_POST_IMAGES[0];
  }

  return BUNDLED_DEMO_POST_IMAGES[hashSeed(normalizedSeed) % BUNDLED_DEMO_POST_IMAGES.length];
}

export function getBundledDemoAvatarUrl(seed: string) {
  const normalizedSeed = normalizeSeed(seed);

  if (!normalizedSeed) {
    return BUNDLED_DEMO_AVATARS[0];
  }

  const directAvatar = DEMO_AVATAR_BY_KEY.get(normalizedSeed);

  if (directAvatar) {
    return directAvatar;
  }

  return BUNDLED_DEMO_AVATARS[hashSeed(normalizedSeed) % BUNDLED_DEMO_AVATARS.length];
}

export function getTrustedDemoMediaPrefix() {
  return TRUSTED_DEMO_MEDIA_PREFIX;
}
