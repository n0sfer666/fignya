import { compileSchema, decodeBinarySchema } from "kiwi-schema";
import { inflateSync } from "fflate";
import { decompress } from "fzstd";
import { isRec, type Rec } from "./guards";

const MAGIC = "fig-kiwi";

const readChunks = (data: Uint8Array): Uint8Array[] => {
  const magic = new TextDecoder().decode(data.subarray(0, MAGIC.length));
  if (magic !== MAGIC) throw new Error(`unexpected magic: ${magic}`);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const chunks: Uint8Array[] = [];
  let offset = MAGIC.length + 4;
  while (offset + 4 <= data.byteLength) {
    const size = view.getUint32(offset, true);
    offset += 4;
    chunks.push(data.subarray(offset, offset + size));
    offset += size;
  }
  return chunks;
};

const isZstd = (chunk: Uint8Array): boolean =>
  chunk[0] === 0x28 && chunk[1] === 0xb5 && chunk[2] === 0x2f && chunk[3] === 0xfd;

const unpack = (chunk: Uint8Array): Uint8Array => (isZstd(chunk) ? decompress(chunk) : inflateSync(chunk));

export const decodeCanvas = (data: Uint8Array): Rec => {
  const [schemaChunk, dataChunk] = readChunks(data);
  if (!schemaChunk || !dataChunk) throw new Error("fig-kiwi: missing chunks");
  const compiled: unknown = compileSchema(decodeBinarySchema(unpack(schemaChunk)));
  if (!isRec(compiled) || typeof compiled.decodeMessage !== "function") {
    throw new Error("kiwi: decodeMessage not compiled");
  }
  const message: unknown = compiled.decodeMessage(unpack(dataChunk));
  if (!isRec(message)) throw new Error("kiwi: message is not an object");
  return message;
};
