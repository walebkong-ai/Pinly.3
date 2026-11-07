import { describe, expect, test, vi } from "vitest";
import { MAX_HEIC_INPUT_BYTES } from "@/lib/heic";
import { readHeicResponse } from "@/lib/server-heic";

describe("HEIC download limits", () => {
  test("reads a photo even when Content-Length is missing", async () => {
    expect(await readHeicResponse(new Response(new Uint8Array([1, 2, 3])))).toEqual(Buffer.from([1, 2, 3]));
  });

  test("cancels an oversized stream even when it declares a smaller length", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(MAX_HEIC_INPUT_BYTES + 1)); },
      cancel
    });
    await expect(readHeicResponse(new Response(body, { headers: { "content-length": "1" } })))
      .rejects.toThrow("conversion limit");
    expect(cancel).toHaveBeenCalled();
  });
});
