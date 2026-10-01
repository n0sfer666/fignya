import { describe, expect, it } from "vitest";
import { cssUrl, downloadFamily } from "../main/google-fonts";
import { cssAnswer, fakeFetcher } from "./font-fetcher";

const IBM = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@";

describe("downloadFamily", () => {
  it("asks css2 for each face separately with a plus-encoded family", () => {
    expect(cssUrl("IBM Plex Mono", { weight: 500, italic: true })).toBe(`${IBM}1,500`);
  });

  it("fetches every subset of the faces Google Fonts has and counts the rest", async () => {
    const fetcher = fakeFetcher({
      [`${IBM}0,400`]: () => new Response(cssAnswer(400, false, "a.woff2") + cssAnswer(400, false, "b.woff2")),
      "https://fonts.gstatic.com/s/a.woff2": () => new Response(new Uint8Array([1])),
      "https://fonts.gstatic.com/s/b.woff2": () => new Response(new Uint8Array([2])),
    });
    const { result, faces } = await downloadFamily(fetcher, { family: "IBM Plex Mono", faces: [{ weight: 400, italic: false }, { weight: 950, italic: true }] });
    expect(result).toEqual({ family: "IBM Plex Mono", status: "downloaded", missingFaces: 1 });
    expect(faces.map((f) => [f.family, f.weight, f.italic, f.unicodeRange, [...f.bytes]])).toEqual([
      ["IBM Plex Mono", 400, false, "U+0400-045F", [1]],
      ["IBM Plex Mono", 400, false, "U+0400-045F", [2]],
    ]);
  });

  it("asks once per distinct face and fetches each file once", async () => {
    const seen: string[] = [];
    const fetcher = fakeFetcher(
      {
        [`${IBM}0,400`]: () => new Response(cssAnswer(400, false, "a.woff2") + cssAnswer(400, false, "a.woff2")),
        "https://fonts.gstatic.com/s/a.woff2": () => new Response(new Uint8Array([1])),
      },
      seen,
    );
    const { faces } = await downloadFamily(fetcher, { family: "IBM Plex Mono", faces: [{ weight: 400, italic: false }, { weight: 400, italic: false }] });
    expect(seen).toEqual([`${IBM}0,400`, "https://fonts.gstatic.com/s/a.woff2"]);
    expect(faces).toHaveLength(1);
  });

  it("reports families Google Fonts does not have", async () => {
    const { result, faces } = await downloadFamily(fakeFetcher({}), { family: "YS Text", faces: [{ weight: 400, italic: false }] });
    expect(result).toEqual({ family: "YS Text", status: "unavailable", missingFaces: 1 });
    expect(faces).toEqual([]);
  });

  it("fails the whole family on network or server errors", async () => {
    const offline = await downloadFamily(async () => Promise.reject(new TypeError("net::ERR_INTERNET_DISCONNECTED")), { family: "Roboto", faces: [{ weight: 400, italic: false }] });
    expect(offline.result).toEqual({ family: "Roboto", status: "failed", missingFaces: 1 });
    const broken = await downloadFamily(
      fakeFetcher({
        [`${IBM}0,400`]: () => new Response(cssAnswer(400, false, "a.woff2")),
        "https://fonts.gstatic.com/s/a.woff2": () => new Response("", { status: 503 }),
      }),
      { family: "IBM Plex Mono", faces: [{ weight: 400, italic: false }] },
    );
    expect(broken).toEqual({ result: { family: "IBM Plex Mono", status: "failed", missingFaces: 1 }, faces: [] });
  });
});
