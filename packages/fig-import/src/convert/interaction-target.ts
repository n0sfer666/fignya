import type { NodeId } from "@fignya/model";
import { rec, type Rec } from "../fig/guards";
import { guidKey } from "../tree/node-index";

const NO_NODE = 0xffffffff;

export const targetOf = (action: Rec): NodeId | undefined => {
  const target = rec(action, "transitionNodeID");
  return target && target.sessionID !== NO_NODE && target.localID !== NO_NODE ? guidKey(target) : undefined;
};
