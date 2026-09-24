const ANY = -1;

const SIGNATURES: [string, number[]][] = [
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/gif", [0x47, 0x49, 0x46]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46, ANY, ANY, ANY, ANY, 0x57, 0x45, 0x42, 0x50]],
];

export const imageMime = (data: Uint8Array): string =>
  SIGNATURES.find(([, sig]) => sig.every((b, i) => b === ANY || data[i] === b))?.[0] ?? "application/octet-stream";
