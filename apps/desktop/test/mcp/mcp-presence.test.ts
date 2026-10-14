import { describe, expect, it } from "vitest";
import { createPresence, IDLE_MS } from "../../main/mcp/presence";

const setup = () => {
  let time = 0;
  const shown: boolean[] = [];
  const presence = createPresence((connected) => shown.push(connected), () => time);
  return { presence, shown, advance: (ms: number) => (time += ms) };
};

describe("mcp presence", () => {
  it("shows a client while it calls and hides it after the idle time", () => {
    const { presence, shown, advance } = setup();
    presence.touch();
    advance(IDLE_MS - 1);
    presence.tick();
    expect(shown).toEqual([true]);
    advance(1);
    presence.tick();
    expect(shown).toEqual([true, false]);
  });

  it("keeps a client with an open stream connected", () => {
    const { presence, shown, advance } = setup();
    const closed = presence.streamOpened();
    advance(IDLE_MS * 3);
    presence.tick();
    expect(shown).toEqual([true]);
    closed();
    closed();
    expect(shown).toEqual([true, false]);
  });

  it("forgets everything on reset", () => {
    const { presence, shown } = setup();
    presence.streamOpened();
    presence.reset();
    expect(shown).toEqual([true, false]);
  });

  it("ignores streams that close after a reset", () => {
    const { presence, shown } = setup();
    const stale = presence.streamOpened();
    presence.reset();
    const fresh = presence.streamOpened();
    stale();
    expect(shown).toEqual([true, false, true]);
    fresh();
    expect(shown).toEqual([true, false, true, false]);
  });
});
