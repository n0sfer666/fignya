import { sameValue, styleDiff, type DesignNode, type NodeId, type Override, type VectorPath } from "@fignya/model";
import { samePaths } from "./same-paths";

const textOf = (node: DesignNode): string | undefined => (node.kind === "text" ? node.text : undefined);

const pathsOf = (node: DesignNode): VectorPath[] | undefined => (node.kind === "vector" ? node.paths : undefined);

export const overridePatch = (path: NodeId[], base: DesignNode, next: DesignNode, componentId: NodeId | undefined): Override | undefined => {
  const style = styleDiff(base.style, next.style);
  const hidden = next.hidden ?? false;
  const text = textOf(next);
  const paths = pathsOf(next);
  const override: Override = {
    path,
    ...(Object.keys(style).length > 0 ? { style } : {}),
    ...(hidden === (base.hidden ?? false) ? {} : { hidden }),
    ...(text === undefined || text === textOf(base) ? {} : { text }),
    ...(paths === undefined || samePaths(paths, pathsOf(base)) ? {} : { paths }),
    ...(componentId === undefined ? {} : { componentId }),
    ...(next.link === undefined || next.link === base.link ? {} : { link: next.link }),
    ...(sameValue(next.swaps ?? [], base.swaps ?? []) ? {} : { swaps: next.swaps ?? [] }),
  };
  return Object.keys(override).length > 1 ? override : undefined;
};
