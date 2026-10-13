import type { NodeId } from "./node";

const SEGMENT = /^(\d+)[:-](\d+)$/;

const idPart = (input: string): string => {
  const param = /[?&]node-id=([^&#]+)/.exec(input)?.[1];
  if (param === undefined) return input;
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
};

export const parseNodeQuery = (input: string): NodeId[] | undefined => {
  const raw = idPart(input.trim());
  const body = raw.startsWith("I") ? raw.slice(1) : raw;
  const chain: NodeId[] = [];
  for (const segment of body.split(";")) {
    const match = SEGMENT.exec(segment.trim());
    if (!match) return undefined;
    chain.push(`${match[1]}:${match[2]}`);
  }
  return raw.startsWith("I") === chain.length > 1 ? chain : undefined;
};
