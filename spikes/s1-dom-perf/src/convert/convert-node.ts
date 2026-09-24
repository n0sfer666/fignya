import type { Rec } from "../fig/guards";
import type { FigNode, NodeIndex } from "../tree/node-index";
import { renderChildren } from "../tree/instances";
import { decorationCss } from "./decoration-css";
import type { El } from "./el";
import { boxCss, containerCss } from "./layout-css";
import { backgroundCss, type ImageUrl } from "./paint";
import { textCss, textOf } from "./text";
import { vectorPaths } from "./vector";

const VECTOR_TYPES = new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE", "REGULAR_POLYGON"]);
const SKIPPED_TYPES = new Set(["SLICE", "STICKY", "CONNECTOR", "WIDGET"]);

export type ConvertContext = {
  index: NodeIndex;
  imageUrl: ImageUrl;
};

const convert = (ctx: ConvertContext, node: FigNode, parent: Rec | undefined, depth: number): El | undefined => {
  const raw = node.raw;
  if (raw.visible === false || SKIPPED_TYPES.has(node.type) || depth > 64) return undefined;
  const isVector = VECTOR_TYPES.has(node.type);
  const css = [...boxCss(raw, parent, parent === undefined), ...decorationCss(raw, node.type, isVector)];
  if (node.type === "TEXT") return { css: [...css, ...textCss(raw)].join(";"), text: textOf(raw) };
  if (isVector) return { css: css.join(";"), svg: vectorPaths(raw, ctx.index.blobs) };
  css.push(...containerCss(raw), ...backgroundCss(raw, ctx.imageUrl));
  const kids = renderChildren(ctx.index, node)
    .map((child) => convert(ctx, child, raw, depth + 1))
    .filter((el): el is El => el !== undefined);
  return kids.length > 0 ? { css: css.join(";"), kids } : { css: css.join(";") };
};

export const convertScreen = (ctx: ConvertContext, node: FigNode): El | undefined => convert(ctx, node, undefined, 0);

export const countEls = (el: El): number => (el.kids ?? []).reduce((sum, kid) => sum + countEls(kid), 1);
