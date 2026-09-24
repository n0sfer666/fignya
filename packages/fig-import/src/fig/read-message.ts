import { ByteBuffer } from "kiwi-schema";
import { isRec, type Rec } from "./guards";
import { kiwiDecoder } from "./kiwi-decoder";
import { openCanvas } from "./open-canvas";

export type NodeEvent = { node: Rec; index: number; total: number };

const NODE_CHANGES = "nodeChanges";

export function* readMessage(data: Uint8Array): Generator<NodeEvent, Rec> {
  const { schema, body } = openCanvas(data);
  const kiwi = kiwiDecoder(schema);
  const message = kiwi.definition("Message");
  if (message.kind !== "MESSAGE") throw new Error("kiwi: Message is not a message");
  const fields = new Map(message.fields.map((f) => [f.value, f]));
  const bb = new ByteBuffer(body);
  const rest: Rec = {};
  for (let id = bb.readVarUint(); id !== 0; id = bb.readVarUint()) {
    const field = fields.get(id);
    if (!field) throw new Error(`kiwi: unknown Message field ${id}`);
    if (field.name !== NODE_CHANGES) {
      rest[field.name] = kiwi.field(field)(bb);
      continue;
    }
    if (!field.isArray) throw new Error("kiwi: nodeChanges is not an array");
    const readNode = kiwi.value(field.type);
    const total = bb.readVarUint();
    for (let index = 0; index < total; index++) {
      const node = readNode(bb);
      if (!isRec(node)) throw new Error("kiwi: node change is not an object");
      yield { node, index, total };
    }
  }
  return rest;
}
