import type { NodeId } from "@fignya/model";
import type { ShotRequest } from "../../thumb-shot";
import type { AgentDocument } from "../agent-deps";
import { addressSchema, requireAddress } from "./address";
import { READ_ONLY, type RegisterTool } from "./tool";

const isScreen = (doc: AgentDocument, id: NodeId): boolean => doc.pages.some((page) => page.screens.some((screen) => screen.id === id));

const requestOf = async (doc: AgentDocument, target: NodeId[]): Promise<ShotRequest> => {
  const [first, ...rest] = target;
  if (first !== undefined && rest.length === 0 && isScreen(doc, first)) return { screenId: first };
  const details = await doc.inspect(target);
  if (!details?.hit.place) throw new Error("no node at this address");
  return { screenId: details.hit.place.screenId, address: target };
};

export const registerScreenshot: RegisterTool = (server, deps, run) => {
  server.registerTool(
    "screenshot",
    {
      title: "Screenshot",
      description: "PNG of a screen or of the screen area under a node, long side at most 1568 px. Reflects edits made so far.",
      inputSchema: { address: addressSchema.describe("Screen id or node address.") },
      annotations: READ_ONLY,
    },
    ({ address }) =>
      run("screenshot", [address], async () => {
        const doc = await deps.doc();
        const shot = await deps.shot(await requestOf(doc, requireAddress(address)));
        return {
          content: [
            { type: "image", data: Buffer.from(shot.png).toString("base64"), mimeType: "image/png" },
            { type: "text", text: `${shot.width}×${shot.height} px` },
          ],
        };
      }),
  );
};
