import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  getSupabaseRuntimeDiagnostics,
  getSupabaseUploadKey,
  parseSupabasePublicMediaUrl
} from "@/lib/supabase-storage";

describe("supabase storage runtime configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("requires the service role key for server uploads", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://vlsjxnserriszfrfxitv.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.SUPABASE_URL = "https://vlsjxnserriszfrfxitv.supabase.co";
    process.env.SUPABASE_ANON_KEY = "server-anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseUploadKey()).toThrow("Set SUPABASE_SERVICE_ROLE_KEY");
  });

  test("reports the public runtime env state without exposing the full anon key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://vlsjxnserriszfrfxitv.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key-123456";
    process.env.SUPABASE_URL = "https://vlsjxnserriszfrfxitv.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "media";

    expect(getSupabaseRuntimeDiagnostics()).toMatchObject({
      nextPublicSupabaseUrl: "https://vlsjxnserriszfrfxitv.supabase.co",
      hasNextPublicSupabaseUrl: true,
      hasNextPublicSupabaseAnonKey: true,
      hasServerSupabaseUrl: true,
      hasSupabaseServiceRoleKey: false,
      storageBucket: "media",
      uploadKeySource: "missing"
    });
    expect(getSupabaseRuntimeDiagnostics().nextPublicSupabaseAnonKey).toBe("public-a...123456");
  });

  test("rejects Supabase media from a different project when the Pinly project URL is configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://vlsjxnserriszfrfxitv.supabase.co";

    expect(
      parseSupabasePublicMediaUrl("https://otherproject.supabase.co/storage/v1/object/public/media/test/example.jpg")
    ).toBeNull();
    expect(
      parseSupabasePublicMediaUrl(
        "https://vlsjxnserriszfrfxitv.supabase.co/storage/v1/object/public/media/test/example.jpg"
      )
    ).toMatchObject({
      bucket: "media",
      objectPath: "test/example.jpg"
    });
  });
});
