import { cssDeclarations } from "./css-text";
import { px, type Declaration, type ImageUrl } from "./css-values";
import { editDefaults } from "./edit-defaults";
import type { DesignNode } from "./node";
import type { Style } from "./style";

export type InspectSectionTitle = "Layout" | "Size" | "Appearance" | "Fill" | "Stroke" | "Effects" | "Typography" | "Other";

export type InspectSection = { title: InspectSectionTitle; rows: Declaration[] };

export type Inspection = { layer: Declaration[]; sections: InspectSection[] };

const SECTIONS: readonly (readonly [InspectSectionTitle, readonly string[]])[] = [
  ["Layout", ["position", "left", "top", "display", "flex-", "gap", "row-gap", "padding", "margin", "justify-content", "align-", "transform", "transform-origin", "scale"]],
  ["Size", ["width", "height", "min-width", "min-height"]],
  ["Appearance", ["opacity", "border-radius", "overflow"]],
  ["Fill", ["background-"]],
  ["Stroke", ["outline"]],
  ["Effects", ["box-shadow", "filter", "backdrop-filter"]],
  ["Typography", ["color", "font-", "line-height", "letter-spacing", "text-", "white-space", "overflow-wrap", "-webkit-"]],
];

const matches = (name: string, pattern: string): boolean => (pattern.endsWith("-") ? name.startsWith(pattern) : name === pattern);

const sectionOf = (name: string): InspectSectionTitle =>
  SECTIONS.find(([, patterns]) => patterns.some((p) => matches(name, p)))?.[0] ?? "Other";

const ORDER: readonly InspectSectionTitle[] = [...SECTIONS.map(([title]) => title), "Other"];

const layerOf = (node: DesignNode, component: DesignNode | undefined): Declaration[] => {
  const base: Declaration[] = [
    ["id", node.id],
    ["name", node.name],
    ["type", node.kind],
  ];
  if (node.kind === "text") return [...base, ["text", node.text]];
  if (node.kind !== "instance") return base;
  return [...base, ["component", component ? `${component.name} (${node.componentId})` : node.componentId]];
};

const overlapOf = (style: Style): Declaration[] => (style.gap !== undefined && style.gap < 0 ? [["gap", px(style.gap)]] : []);

export const inspect = (node: DesignNode, component: DesignNode | undefined, url: ImageUrl): Inspection => {
  const declarations = [...cssDeclarations(node.style, url), ...overlapOf(node.style), ...editDefaults(node)];
  const sections = ORDER.map((title) => ({ title, rows: declarations.filter(([name]) => sectionOf(name) === title) }));
  return { layer: layerOf(node, component), sections: sections.filter((s) => s.rows.length > 0) };
};
