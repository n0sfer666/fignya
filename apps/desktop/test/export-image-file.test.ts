import { describe, expect, it } from "vitest";
import { imageFile } from "../main/export-image-file";

describe("imageFile", () => {
  it("names the image by hash with the extension of its signature", () => {
    expect(imageFile("ab", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("ab.png");
    expect(imageFile("ab", new Uint8Array([0xff, 0xd8, 0xff, 0]))).toBe("ab.jpg");
    expect(imageFile("ab", new Uint8Array([0x47, 0x49, 0x46]))).toBe("ab.gif");
    expect(imageFile("ab", new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("ab.webp");
    expect(imageFile("ab", new Uint8Array([1, 2, 3]))).toBe("ab.bin");
  });
});
