import type { DesignNode, InstanceNode, NodeId, Override, ScreenModel, Style, Swap } from "@fignya/model";
import { frame, modelOf } from "./play-nodes";

type Variant = { id: NodeId; set: NodeId; swaps: Swap[]; children?: string[]; style?: Style };

const VARIANTS: Variant[] = [
  { id: "v", set: "set", swaps: [{ on: "hover", to: "h" }, { on: "click", to: "p" }], children: ["label", "badge"], style: { opacity: 1 } },
  { id: "h", set: "set", swaps: [{ on: "click", to: "p" }], style: { opacity: 0.5 } },
  { id: "p", set: "set", swaps: [] },
  { id: "m1", set: "set", swaps: [{ on: "enter", to: "m2" }] },
  { id: "m2", set: "set", swaps: [{ on: "leave", to: "m3" }] },
  { id: "m3", set: "set", swaps: [] },
  { id: "o1", set: "oset", swaps: [{ on: "hover", to: "o2" }], children: ["slot"] },
  { id: "o2", set: "oset", swaps: [], children: ["slot"] },
];

const swapsOf = (componentId: NodeId): Swap[] => VARIANTS.find((v) => v.id === componentId)?.swaps ?? [];

const instance = (id: NodeId, componentId: NodeId, overrides: Override[] = [], extra: Partial<InstanceNode> = {}): InstanceNode => ({
  id,
  name: id,
  kind: "instance",
  children: [],
  style: {},
  componentId,
  overrides,
  swaps: swapsOf(componentId),
  ...extra,
});

const child = (variant: NodeId, name: string): DesignNode =>
  name === "slot"
    ? instance(`${variant}-slot`, "v", [], { name, parentId: variant })
    : { id: `${variant}-${name}`, name, parentId: variant, kind: "text", children: [], style: {}, text: `${variant} ${name}` };

const variantNodes = ({ id, set, swaps, children = ["label"], style = {} }: Variant): DesignNode[] => [
  { id, name: id, parentId: set, kind: "component", children: children.map((name) => `${id}-${name}`), style, swaps },
  ...children.map((name) => child(id, name)),
];

export const MODELS: ReadonlyMap<NodeId, ScreenModel> = new Map([
  [
    "a",
    modelOf("a", [
      frame("a", ["btn", "tog", "card", "nav", "bar", "box", "lost", "plain"]),
      instance("btn", "v", [{ path: ["v-label"], text: "Buy" }, { path: ["v-badge"], text: "New" }], { style: { opacity: 0.5 } }),
      instance("tog", "m1"),
      instance("card", "cc"),
      { id: "cc", name: "cc", kind: "component", children: ["inner"], style: {} },
      instance("inner", "v", [], { parentId: "cc" }),
      instance("nav", "v", [], { link: "b" }),
      instance("bar", "tb"),
      { id: "tb", name: "tb", kind: "component", children: ["t1", "t2"], style: {} },
      instance("t1", "v", [], { parentId: "tb" }),
      instance("t2", "v", [], { parentId: "tb" }),
      instance("box", "o1"),
      instance("lost", "p", [], { swaps: [{ on: "click", to: "gone" }] }),
      frame("plain"),
      ...VARIANTS.flatMap(variantNodes),
    ]),
  ],
  ["b", modelOf("b", [frame("b")])],
]);
