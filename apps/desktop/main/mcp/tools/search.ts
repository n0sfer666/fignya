import { SEARCH_LIMIT } from "@fignya/model";
import * as z from "zod";
import { jsonResult } from "../tool-result";
import { addressText } from "./address";
import { READ_ONLY, type RegisterTool } from "./tool";

export const registerSearch: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "search",
    {
      title: "Search",
      description: `Find layers by id, Figma node link or a case-insensitive substring of the layer name, hidden layers included. At most ${SEARCH_LIMIT} hits.`,
      inputSchema: { query: z.string().min(1).max(2048) },
      annotations: READ_ONLY,
    },
    ({ query }) =>
      run("search", [], async () => {
        const doc = await deps.doc();
        const hits = await doc.search(query, true);
        return jsonResult(
          hits.map((hit) => ({
            address: addressText(hit.target),
            kind: hit.kind,
            path: hit.trail.join(" / "),
            hidden: hit.hidden,
            screen: hit.place?.screenId,
            page: hit.place?.pageId,
          })),
        );
      }),
  );
};
