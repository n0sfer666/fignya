import type { DesignDocument } from "./document";
import type { DesignNode, NodeId } from "./node";
import { pathKey } from "./override";
import { parentOf } from "./parent-of";

const overridden = (nodes: DesignNode[], chain: NodeId[], at: number, id: NodeId): boolean | undefined => {
  for (const [i, owner] of nodes.slice(0, at).entries()) {
    if (owner.kind !== "instance") continue;
    const key = pathKey([...chain.slice(i + 1, at), id]);
    const hidden = owner.overrides.find((o) => pathKey(o.path) === key)?.hidden;
    if (hidden !== undefined) return hidden;
  }
  return undefined;
};

const masterLine = (doc: DesignDocument, node: DesignNode, owner: DesignNode | undefined): DesignNode[] => {
  if (owner?.kind !== "instance") return [node];
  const line: DesignNode[] = [];
  const seen = new Set<NodeId>();
  for (let current: DesignNode | undefined = node; current && !seen.has(current.id); current = parentOf(doc, current)) {
    if (current.id === owner.componentId) return line;
    seen.add(current.id);
    line.push(current);
  }
  return [node];
};

export const chainHidden = (doc: DesignDocument, nodes: DesignNode[], chain: NodeId[]): boolean =>
  nodes.some((node, at) =>
    masterLine(doc, node, nodes[at - 1]).some((n) => (overridden(nodes, chain, at, n.id) ?? n.hidden) === true),
  );
