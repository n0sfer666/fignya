import { isImageFill, type DesignNode, type Paint, type ScreenModel, type VectorPath } from "@fignya/model";

const paintHashes = (paints: Paint[] | undefined): string[] => (paints ?? []).flatMap((p) => (p.kind === "image" ? [p.hash] : []));

const pathHashes = (paths: VectorPath[] | undefined): string[] => (paths ?? []).flatMap(({ fill }) => (isImageFill(fill) ? [fill.hash] : []));

const overrideHashes = (node: DesignNode): string[] =>
  node.kind === "instance" ? node.overrides.flatMap((o) => [...paintHashes(o.style?.background), ...pathHashes(o.paths)]) : [];

const nodeHashes = (node: DesignNode): string[] => [
  ...paintHashes(node.style.background),
  ...(node.kind === "vector" ? pathHashes(node.paths) : []),
  ...overrideHashes(node),
];

export const imageHashes = (model: ScreenModel): string[] => [...new Set([...model.nodes.values()].flatMap(nodeHashes))];
