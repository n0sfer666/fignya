import { chainHidden } from "./chain-hidden";
import type { DesignDocument } from "./document";
import type { DesignNode, NodeId } from "./node";
import { parentOf } from "./parent-of";
import type { SearchHit, SearchPlace } from "./search-hit";

type Place = SearchPlace & { pageName: string };

const ancestry = (doc: DesignDocument, node: DesignNode): DesignNode[] => {
  const out: DesignNode[] = [];
  const seen = new Set<NodeId>();
  for (let current: DesignNode | undefined = node; current && !seen.has(current.id); current = parentOf(doc, current)) {
    seen.add(current.id);
    out.unshift(current);
  }
  return out;
};

const placeOf = (doc: DesignDocument, line: DesignNode[]): Place | undefined => {
  for (const page of doc.pages) {
    const screen = line.find((node) => page.screens.some((s) => s.id === node.id));
    if (screen) return { pageId: page.id, pageName: page.name, screenId: screen.id };
  }
  return undefined;
};

export const locateNode = (doc: DesignDocument, chain: NodeId[]): SearchHit | undefined => {
  const nodes = chain.flatMap((id) => doc.nodes.get(id) ?? []);
  const [head, ...inner] = nodes;
  const last = nodes.at(-1);
  if (!head || !last || nodes.length !== chain.length) return undefined;
  const outer = ancestry(doc, head);
  const line = [...outer, ...inner];
  const place = placeOf(doc, outer);
  const trail = line.map((n) => n.name || n.id);
  return {
    match: "id",
    target: chain,
    kind: last.kind,
    trail: place ? [place.pageName, ...trail] : trail,
    hidden: outer.some((n) => n.hidden === true) || chainHidden(doc, nodes, chain),
    ...(place ? { place: { pageId: place.pageId, screenId: place.screenId } } : {}),
  };
};
