import type { DesignNode, NodeMap, Override, Style } from "@fignya/model";

export type FontFaceUse = { weight: number; italic: boolean };

export type FontUsage = { family: string; nodes: number; faces: FontFaceUse[] };

type Face = FontFaceUse & { family: string };

type Tally = { nodes: number; faces: Map<string, FontFaceUse> };

const DEFAULT_WEIGHT = 400;

const faceOf = (style: Style, base: Style | undefined): Face | undefined => {
  const family = style.fontFamily ?? base?.fontFamily;
  if (family === undefined) return undefined;
  return { family, weight: style.fontWeight ?? base?.fontWeight ?? DEFAULT_WEIGHT, italic: (style.fontStyle ?? base?.fontStyle) === "italic" };
};

const touchesFont = (style: Style): boolean => style.fontFamily !== undefined || style.fontWeight !== undefined || style.fontStyle !== undefined;

const overridesOf = (node: DesignNode): readonly Override[] => {
  if (node.kind !== "instance") return [];
  try {
    return node.overrides;
  } catch {
    return [];
  }
};

const targetStyle = (nodes: NodeMap, override: Override): Style | undefined => {
  const id = override.path.at(-1);
  return id === undefined ? undefined : nodes.get(id)?.style;
};

const byWeight = (a: FontFaceUse, b: FontFaceUse): number => Number(a.italic) - Number(b.italic) || a.weight - b.weight;

export const documentFonts = (nodes: NodeMap): FontUsage[] => {
  const tallies = new Map<string, Tally>();
  const add = (face: Face | undefined): void => {
    if (!face) return;
    const tally = tallies.get(face.family) ?? { nodes: 0, faces: new Map() };
    tally.nodes += 1;
    tally.faces.set(`${face.weight}:${face.italic}`, { weight: face.weight, italic: face.italic });
    tallies.set(face.family, tally);
  };
  for (const node of nodes.values()) {
    if (node.kind === "text") add(faceOf(node.style, undefined));
    for (const override of overridesOf(node)) {
      if (override.style && touchesFont(override.style)) add(faceOf(override.style, targetStyle(nodes, override)));
    }
  }
  return [...tallies]
    .map(([family, { nodes: count, faces }]) => ({ family, nodes: count, faces: [...faces.values()].sort(byWeight) }))
    .sort((a, b) => b.nodes - a.nodes || a.family.localeCompare(b.family));
};
