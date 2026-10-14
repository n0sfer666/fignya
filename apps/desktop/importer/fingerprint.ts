import { createHash } from "node:crypto";
import type { BaseFingerprint } from "./sidecar-format";

export const fingerprint = (bytes: Uint8Array): BaseFingerprint => ({ size: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
