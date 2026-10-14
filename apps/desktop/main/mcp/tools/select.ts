import { textResult } from "../tool-result";
import { addressSchema, requireAddress } from "./address";
import { UI_ONLY, type RegisterTool } from "./tool";

export const registerSelect: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "select",
    {
      title: "Select",
      description: "Open the screen of a node and select it in the app, as if the user picked it.",
      inputSchema: { address: addressSchema },
      annotations: UI_ONLY,
    },
    ({ address }) =>
      run("select", [address], async () => {
        const doc = await deps.doc();
        const details = await doc.inspect(requireAddress(address));
        if (!details?.hit.place) throw new Error("no node at this address");
        deps.focus({ place: details.hit.place, target: details.hit.target });
        return textResult("selected");
      }),
  );
};
