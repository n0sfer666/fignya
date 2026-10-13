import { decodeBinarySchema, type Schema } from "kiwi-schema";
import { inflateSync } from "fflate";
import { decompress } from "fzstd";

const MAGIC = "fig-kiwi";

export type CanvasPayload = { schema: Schema; body: Uint8Array };

const magicOf = (data: Uint8Array): string => new TextDecoder().decode(data.subarray(0, MAGIC.length));

export const isFigKiwi = (data: Uint8Array): boolean => magicOf(data) === MAGIC;

const readChunks = (data: Uint8Array): Uint8Array[] => {
  if (!isFigKiwi(data)) throw new Error(`unexpected magic: ${magicOf(data)}`);
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

export const openCanvas = (data: Uint8Array): CanvasPayload => {
  const [schemaChunk, dataChunk] = readChunks(data);
  if (!schemaChunk || !dataChunk) throw new Error("fig-kiwi: missing chunks");
  return { schema: decodeBinarySchema(unpack(schemaChunk)), body: unpack(dataChunk) };
};
