import { rec, str, type Rec } from "../fig/guards";
import { guidKey } from "./node-index";

export const refKey = (ref: Rec | undefined): string | undefined => {
  const asset = str(rec(ref ?? {}, "assetRef"), "key");
  const key = asset === undefined || asset === "" ? guidKey(rec(ref ?? {}, "guid")) : asset;
  return key === "" ? undefined : key;
};
