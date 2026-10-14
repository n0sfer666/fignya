import type { Declaration } from "@fignya/model";
import { jsonResult } from "../tool-result";
import { addressSchema, addressText, requireAddress } from "./address";
import { READ_ONLY, type RegisterTool } from "./tool";

const cssOf = (rows: readonly Declaration[]): string => rows.map(([property, value]) => `${property}: ${value};`).join(" ");

export const registerInspect: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "inspect",
    {
      title: "Inspect",
      description: "CSS of a node by section, plus the current values of the editable style keys in the format apply_edits accepts.",
      inputSchema: { address: addressSchema },
      annotations: READ_ONLY,
    },
    ({ address }) =>
      run("inspect", [address], async () => {
        const doc = await deps.doc();
        const details = await doc.inspect(requireAddress(address));
        if (!details) throw new Error("no node at this address");
        const { hit, inspection, values } = details;
        return jsonResult({
          address: addressText(hit.target),
          kind: hit.kind,
          path: hit.trail.join(" / "),
          hidden: hit.hidden,
          screen: hit.place?.screenId,
          layer: cssOf(inspection.layer),
          css: Object.fromEntries(inspection.sections.map((section) => [section.title, cssOf(section.rows)])),
          editable: values,
        });
      }),
  );
};
