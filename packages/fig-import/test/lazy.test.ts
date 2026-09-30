import { describe, expect, it } from "vitest";
import { lazy } from "../src/lazy";

describe("lazy", () => {
  it("makes the value on the first call and reuses it", () => {
    let made = 0;
    const value = lazy(() => ({ n: ++made }));
    expect(made).toBe(0);
    expect(value()).toBe(value());
    expect(made).toBe(1);
  });

  it("keeps throwing the first error without making the value again", () => {
    let made = 0;
    const value = lazy((): string => {
      made += 1;
      throw new Error(`failed ${made}`);
    });
    expect(() => value()).toThrow("failed 1");
    expect(() => value()).toThrow("failed 1");
    expect(made).toBe(1);
  });
});
