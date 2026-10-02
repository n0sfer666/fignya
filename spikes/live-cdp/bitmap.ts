import { readFileSync, rmSync } from "node:fs";

export type Bitmap = { width: number; height: number; pixel: (x: number, y: number) => number[] };

export const bitmap = (png: string): Bitmap => {
  const bmp = `${png}.bmp`;
  const r = Bun.spawnSync(["sips", "-s", "format", "bmp", png, "--out", bmp]);
  if (r.exitCode !== 0) throw new Error(`sips: ${r.stderr.toString()}`);
  const buf = readFileSync(bmp);
  rmSync(bmp);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  if ((bpp !== 24 && bpp !== 32) || (compression !== 0 && compression !== 3)) throw new Error(`${png}: unsupported BMP ${bpp}bpp, compression ${compression}`);
  const height = Math.abs(rawHeight);
  const bytes = bpp / 8;
  const stride = ((width * bpp + 31) >> 5) * 4;
  const data = view.getUint32(10, true);
  const pixel = (x: number, y: number): number[] => {
    const row = rawHeight < 0 ? y : height - 1 - y;
    const at = data + row * stride + x * bytes;
    return [...buf.subarray(at, at + bytes)];
  };
  return { width, height, pixel };
};
