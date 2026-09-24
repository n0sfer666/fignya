import { isRec, num, recs, str, type Rec } from "../fig/guards";

export type Scene = {
  kind: string;
  id: string;
  width: number;
  height: number;
  scale: number;
  root: unknown;
  thumbs: Rec[];
};

export const readScene = (): Scene => {
  const data: unknown = JSON.parse(document.getElementById("scene")?.textContent ?? "{}");
  if (!isRec(data)) throw new Error("scene is not an object");
  return {
    kind: str(data, "kind") ?? "",
    id: str(data, "id") ?? "",
    width: num(data, "width") ?? 0,
    height: num(data, "height") ?? 0,
    scale: num(data, "scale") ?? 1,
    root: data.root,
    thumbs: recs(data, "thumbs"),
  };
};

export const worldElement = (): HTMLElement => {
  const world = document.getElementById("world");
  if (!world) throw new Error("#world not found");
  return world;
};
