import { figIndex } from "./fig-index";

const needles = process.argv.slice(2);
const { byKey } = figIndex();
const seen = (value: unknown): string => JSON.stringify(value, (_k, v: unknown) => (v instanceof Uint8Array ? `<${v.length}b>` : v));
for (const [key, node] of byKey) {
  const text = seen(node.raw);
  const hits = needles.filter((n) => text.includes(n));
  if (hits.length > 0) console.log(`${key} ${node.type} «${String(node.raw.name)}» ${hits.join(", ")}`);
}
