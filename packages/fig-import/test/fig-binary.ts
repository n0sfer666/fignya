import { compileSchema, encodeBinarySchema, parseSchema } from "kiwi-schema";
import { deflateSync, zipSync } from "fflate";
import { isRec, type Rec } from "../src/fig/guards";

const SCHEMA = `
package fig;
enum NodeType { DOCUMENT = 1; CANVAS = 2; FRAME = 3; TEXT = 4; }
struct GUID { uint sessionID; uint localID; }
message ParentIndex { GUID guid = 1; string position = 2; }
message Vector { float x = 1; float y = 2; }
enum MessageType { JOIN_START = 0; NODE_CHANGES = 1; }
message Blob { byte[] bytes = 1; }
message NodeChange { GUID guid = 1; ParentIndex parentIndex = 2; NodeType type = 3; string name = 4; Vector size = 5; Vector derivedSize = 6; }
message Message { MessageType type = 2; uint sessionID = 3; string[] labels = 5; GUID origin = 6; NodeChange[] nodeChanges = 1; Blob[] blobs = 4; }
`;

const chunk = (bytes: Uint8Array): Uint8Array[] => {
  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, bytes.byteLength, true);
  return [size, bytes];
};

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0));
  parts.reduce((offset, p) => {
    out.set(p, offset);
    return offset + p.byteLength;
  }, 0);
  return out;
};

export const encodeMessage = (message: Rec): Uint8Array => {
  const schema = parseSchema(SCHEMA);
  const compiled: unknown = compileSchema(schema);
  if (!isRec(compiled) || typeof compiled.encodeMessage !== "function") throw new Error("kiwi: encodeMessage missing");
  const encoded: unknown = compiled.encodeMessage(message);
  if (!(encoded instanceof Uint8Array)) throw new Error("kiwi: encodeMessage returned non-bytes");
  return concat([
    new TextEncoder().encode("fig-kiwi"),
    new Uint8Array(4),
    ...chunk(deflateSync(encodeBinarySchema(schema))),
    ...chunk(deflateSync(encoded)),
  ]);
};

export const figFile = (message: Rec, images: Record<string, Uint8Array> = {}): Uint8Array =>
  zipSync({
    "canvas.fig": encodeMessage(message),
    ...Object.fromEntries(Object.entries(images).map(([hash, data]) => [`images/${hash}`, data])),
  });
