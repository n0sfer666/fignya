import { MAX_CHAIN_LENGTH, MAX_ID_LENGTH, parseAddress, type NodeId } from "@fignya/model";
import * as z from "zod";

export const ADDRESS_HINT = 'Node address: ids joined by "/" from the outermost instance, as printed by outline/search (e.g. "12:3/45:6").';

export const addressSchema = z.string().min(1).max(MAX_CHAIN_LENGTH * (MAX_ID_LENGTH + 1)).describe(ADDRESS_HINT);

export const addressText = (target: readonly NodeId[]): string => target.join("/");

export const requireAddress = (address: string): NodeId[] => {
  const target = parseAddress(address);
  if (!target) throw new Error("invalid address");
  return target;
};
