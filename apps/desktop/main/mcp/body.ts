export const MAX_BODY_BYTES = 4 * 1024 * 1024;

export type Body = { ok: true; body: unknown } | { ok: false; status: 400 | 413; message: string };

const parsed = (text: string): Body => {
  try {
    const body: unknown = JSON.parse(text);
    return { ok: true, body };
  } catch {
    return { ok: false, status: 400, message: "request body is not JSON" };
  }
};

export const readJson = async (req: AsyncIterable<unknown>, limit = MAX_BODY_BYTES): Promise<Body> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += bytes.length;
    if (size > limit) return { ok: false, status: 413, message: "request body is too large" };
    chunks.push(bytes);
  }
  return parsed(Buffer.concat(chunks).toString("utf8"));
};
