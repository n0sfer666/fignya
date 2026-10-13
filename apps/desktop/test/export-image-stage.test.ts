import { afterEach, describe, expect, it, vi } from "vitest";
import { createImageStage } from "../main/export-image-stage";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]);

const counting = () => {
  const reads: string[] = [];
  const read = async (hash: string): Promise<Uint8Array | undefined> => {
    reads.push(hash);
    return hash === "ab" ? PNG : undefined;
  };
  return { reads, read };
};

describe("createImageStage", () => {
  it("names the staged images by signature and reads each hash once", async () => {
    const { reads, read } = counting();
    const stage = createImageStage(read);
    expect(await stage.stage(["ab", "ab", "gone"])).toEqual({ ab: "ab.png" });
    expect(await stage.image("ab")).toBe(PNG);
    expect(reads).toEqual(["ab", "gone"]);
  });

  it("reads the document again once cleared", async () => {
    const { reads, read } = counting();
    const stage = createImageStage(read);
    await stage.stage(["ab"]);
    stage.clear();
    expect(await stage.image("ab")).toBe(PNG);
    expect(reads).toEqual(["ab", "ab"]);
  });

  it("drops the images of a previous export", async () => {
    const { reads, read } = counting();
    const stage = createImageStage(read);
    await stage.stage(["ab"]);
    await stage.stage([]);
    await stage.image("ab");
    expect(reads).toEqual(["ab", "ab"]);
  });

  it("lets the staged images go when no export follows", async () => {
    vi.useFakeTimers();
    const { reads, read } = counting();
    const stage = createImageStage(read, 1000);
    await stage.stage(["ab"]);
    vi.advanceTimersByTime(1000);
    await stage.image("ab");
    expect(reads).toEqual(["ab", "ab"]);
  });
});

afterEach(() => {
  vi.useRealTimers();
});
