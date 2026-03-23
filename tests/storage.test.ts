import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { StorageConfigError, assertStorageConfiguration, getBlobAccessMode, getMaxUploadSizeBytes, getStorageDriver, inferMediaType, saveUploadedFile } from "@/lib/storage";

const originalEnv = { ...process.env };
const testUploadDir = "public/test-uploads";

describe("storage configuration", () => {
  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    await fs.rm(path.resolve(process.cwd(), testUploadDir), { recursive: true, force: true });
  });

  test("uses local uploads when configured", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "local",
      UPLOAD_DIR: testUploadDir,
      BLOB_READ_WRITE_TOKEN: ""
    };

    expect(getStorageDriver()).toBe("local");
  });

  test("fails loudly when blob storage is missing its token", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: ""
    };

    expect(() => assertStorageConfiguration()).toThrow(StorageConfigError);
  });

  test("writes local uploads into the public uploads directory", async () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "local",
      UPLOAD_DIR: testUploadDir,
      BLOB_READ_WRITE_TOKEN: ""
    };

    const file = new File([new Uint8Array([1, 2, 3, 4])], "photo.png", { type: "image/png" });
    const savedUrl = await saveUploadedFile(file, { ownerId: "user_1" });

    expect(savedUrl).toMatch(/^\/test-uploads\/user_1\/.+\.png$/);
    const savedPath = path.resolve(process.cwd(), "public", savedUrl.replace(/^\//, ""));
    await expect(fs.readFile(savedPath)).resolves.toEqual(Buffer.from([1, 2, 3, 4]));
  });

  test("defaults blob uploads to private access", () => {
    process.env = {
      ...originalEnv,
      STORAGE_DRIVER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "token"
    };

    expect(getBlobAccessMode()).toBe("private");
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
