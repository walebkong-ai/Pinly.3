import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  uploadMock,
  getSupabasePublicBaseUrlMock,
  getSupabaseUploadKeyMock,
  getSupabaseStorageBucketMock,
  createSupabaseUploadClientMock
} = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  getSupabasePublicBaseUrlMock: vi.fn(),
  getSupabaseUploadKeyMock: vi.fn(),
  getSupabaseStorageBucketMock: vi.fn(),
  createSupabaseUploadClientMock: vi.fn()
}));

vi.mock("@/lib/supabase-storage", () => ({
  buildSupabasePublicMediaUrl: vi.fn((objectPath: string, bucket: string) => `https://demo.supabase.co/storage/v1/object/public/${bucket}/${objectPath}`),
  createSupabaseUploadClient: createSupabaseUploadClientMock,
  getSupabasePublicBaseUrl: getSupabasePublicBaseUrlMock,
  getSupabaseUploadKey: getSupabaseUploadKeyMock,
  getSupabaseStorageBucket: getSupabaseStorageBucketMock
}));

import {
  StorageConfigError,
  assertStorageConfiguration,
  getMaxUploadSizeBytes,
  getStorageDriver,
  inferMediaType,
  saveUploadedFile
} from "@/lib/storage";

describe("storage configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    uploadMock.mockReset();
    getSupabasePublicBaseUrlMock.mockReset();
    getSupabaseUploadKeyMock.mockReset();
    getSupabaseStorageBucketMock.mockReset();
    createSupabaseUploadClientMock.mockReset();

    getSupabasePublicBaseUrlMock.mockReturnValue("https://demo.supabase.co");
    getSupabaseUploadKeyMock.mockReturnValue("upload-key");
    getSupabaseStorageBucketMock.mockReturnValue("media");
    uploadMock.mockResolvedValue({ error: null });
    createSupabaseUploadClientMock.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadMock
        })
      }
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  test("uses Supabase storage only", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "supabase"
    };

    expect(getStorageDriver()).toBe("supabase");
  });

  test("treats legacy storage driver values as stale aliases for Supabase", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "local"
    };

    expect(getStorageDriver()).toBe("supabase");
  });

  test("uploads files to Supabase public storage", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "photo.png", { type: "image/png" });
    const savedUrl = await saveUploadedFile(file, { ownerId: "user_1" });

    expect(savedUrl).toMatch(/^https:\/\/demo\.supabase\.co\/storage\/v1\/object\/public\/media\/user_1\/.+\.png$/);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^user_1\/.+\.png$/),
      expect.any(Uint8Array),
      expect.objectContaining({
        contentType: "image/png",
        upsert: false
      })
    );
  });

  test("validates the Supabase storage configuration", () => {
    expect(() => assertStorageConfiguration()).not.toThrow();
    expect(getSupabasePublicBaseUrlMock).toHaveBeenCalled();
    expect(getSupabaseUploadKeyMock).toHaveBeenCalled();
    expect(getSupabaseStorageBucketMock).toHaveBeenCalled();
  });

  test("falls back to embedded uploads outside production when Supabase is not configured", async () => {
    getSupabasePublicBaseUrlMock.mockImplementation(() => {
      throw new Error("missing supabase url");
    });

    const file = new File([new Uint8Array([1, 2, 3, 4])], "photo.png", { type: "image/png" });
    expect(() => assertStorageConfiguration()).not.toThrow();
    const savedUrl = await saveUploadedFile(file, { ownerId: "user_1" });

    expect(savedUrl).toBe("data:image/png;base64,AQIDBA==");
    expect(createSupabaseUploadClientMock).not.toHaveBeenCalled();
  });

  test("still fails loudly in production when Supabase is not configured", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production"
    };
    getSupabasePublicBaseUrlMock.mockImplementation(() => {
      throw new Error("missing supabase url");
    });

    expect(() => assertStorageConfiguration()).toThrow(StorageConfigError);
  });

  test("uses the embedded upload fallback for local production-style runtimes", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      NEXTAUTH_URL: "http://localhost:3000"
    };
    getSupabasePublicBaseUrlMock.mockImplementation(() => {
      throw new Error("missing supabase url");
    });

    const file = new File([new Uint8Array([1, 2, 3, 4])], "photo.png", { type: "image/png" });
    expect(() => assertStorageConfiguration()).not.toThrow();
    const savedUrl = await saveUploadedFile(file, { ownerId: "user_1" });

    expect(savedUrl).toBe("data:image/png;base64,AQIDBA==");
    expect(createSupabaseUploadClientMock).not.toHaveBeenCalled();
  });

  test("rejects invalid upload size configuration", () => {
    process.env = {
      ...originalEnv,
      MAX_UPLOAD_SIZE_MB: "0"
    };

    expect(() => getMaxUploadSizeBytes()).toThrow(StorageConfigError);
  });

  test("rejects disallowed upload file extensions", () => {
    const fakeFile = {
      name: "avatar.svg",
      type: "image/svg+xml"
    } as File;

    expect(() => inferMediaType(fakeFile)).toThrow("Unsupported file type");
  });
});
