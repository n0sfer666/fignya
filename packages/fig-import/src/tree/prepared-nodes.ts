import type { Rec } from "../fig/guards";
import { withSharedStyles } from "./shared-styles";
import { withVariables } from "./variables";

export const preparedNodes = (nodes: Rec[]): Rec[] => withVariables(withSharedStyles(nodes));
