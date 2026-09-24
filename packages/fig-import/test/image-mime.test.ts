import { describe, expect, it } from "vitest";
import { imageMime } from "../src";

describe("imageMime", () => {
  it("detects type by signature", () => {
    expect(imageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0]))).toBe("image/png");
    expect(imageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageMime(new Uint8Array([1, 2]))).toBe("application/octet-stream");
  });

  it("requires WEBP marker after RIFF", () => {
    const riff = (kind: string): Uint8Array => new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode(kind)]);
    expect(imageMime(riff("WEBP"))).toBe("image/webp");
    expect(imageMime(riff("WAVE"))).toBe("application/octet-stream");
  });
});
