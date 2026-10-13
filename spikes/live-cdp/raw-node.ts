import { figIndex } from "./fig-index";

const [id = "", ...keys] = process.argv.slice(2);
const { byKey } = figIndex();
const node = byKey.get(id);
if (!node) throw new Error(`${id}: not found`);
const picked = keys.length > 0 ? Object.fromEntries(keys.map((k) => [k, node.raw[k]])) : node.raw;
console.log(JSON.stringify(picked, (_k, v: unknown) => (v instanceof Uint8Array ? `<${v.length}b>` : v), 1));
