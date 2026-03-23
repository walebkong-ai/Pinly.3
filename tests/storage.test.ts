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
  getSupabaseStorageBucket: getSupabaseStorageBucketMock,
  SupabaseMediaConfigError: class SupabaseMediaConfigError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "SupabaseMediaConfigError";
    }
  }
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

    // Mock environment to ensure no fallback triggers
    process.env.SUPABASE_URL = "https://demo.supabase.co";

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

  test("uses Supabase storage driver only", () => {
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
