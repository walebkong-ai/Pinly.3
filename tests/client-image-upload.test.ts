import { beforeEach, describe, expect, test, vi } from "vitest";
import { isHeicFile, MAX_HEIC_INPUT_BYTES } from "@/lib/heic";
import { prepareImageForEditing } from "@/lib/client-image-upload";

const { heicToMock } = vi.hoisted(() => ({ heicToMock: vi.fn() }));
vi.mock("heic-to/csp", () => ({ heicTo: heicToMock }));

describe("iPhone photo preparation", () => {
  beforeEach(() => { heicToMock.mockReset(); });

  test.each([
    { name: "IMG_1234.HEIC", type: "" },
    { name: "photo.heif", type: "application/octet-stream" },
    { name: "photo", type: "image/heic" },
    { name: "photo", type: "image/heif-sequence" }
  ])("recognizes HEIC without relying on the browser's MIME type: $name $type", (file) => {
    expect(isHeicFile(file)).toBe(true);
  });

  test("converts HEIC to a JPEG file before the crop editor receives it", async () => {
    const input = new File(["heic bytes"], "IMG_1234.HEIC", { lastModified: 123 });
    heicToMock.mockResolvedValue(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
    const output = await prepareImageForEditing(input);
    expect(output.name).toBe("IMG_1234.jpg");
    expect(output.type).toBe("image/jpeg");
    expect(output.lastModified).toBe(123);
    expect(heicToMock).toHaveBeenCalledWith({ blob: input, type: "image/jpeg", quality: 0.9 });
  });

  test("leaves JPEG photos unchanged and does not invoke the decoder", async () => {
    const input = new File(["jpeg bytes"], "photo.jpg", { type: "image/jpeg" });
    expect(await prepareImageForEditing(input)).toBe(input);
    expect(heicToMock).not.toHaveBeenCalled();
  });

  test("handles an iPhone picker that has already converted the photo but kept its HEIC filename", async () => {
    const input = new File([new Uint8Array([0xff, 0xd8, 0xff])], "IMG_1234.HEIC", { type: "image/jpeg" });
    const output = await prepareImageForEditing(input);
    expect(output.type).toBe("image/jpeg");
    expect(output.name).toBe("IMG_1234.jpg");
    expect(heicToMock).not.toHaveBeenCalled();
  });

  test("shows an actionable error for damaged HEIC instead of returning an unrenderable file", async () => {
    heicToMock.mockRejectedValue(new Error("decoder failure"));
    await expect(prepareImageForEditing(new File(["bad"], "photo.heic"))).rejects.toThrow("Could not convert");
  });

  test("rejects oversized HEIC before loading the decoder", async () => {
    const input = new File([new Uint8Array(MAX_HEIC_INPUT_BYTES + 1)], "large.heic");
    await expect(prepareImageForEditing(input)).rejects.toThrow("under 20 MB");
    expect(heicToMock).not.toHaveBeenCalled();
  });
});
