import { parseSupabasePublicMediaUrl } from "@/lib/supabase-storage";

export function normalizeStoredMediaUrl(value: string | null | undefined) {
  return parseSupabasePublicMediaUrl(value)?.url ?? null;
}

export function normalizeProfileImageUrl(value: string | null | undefined) {
  return normalizeStoredMediaUrl(value);
}

export function isTrustedStoredMediaUrl(value: string | null | undefined): value is string {
  return normalizeStoredMediaUrl(value) !== null;
}
