import type { Rec } from "../fig/guards";
import { withSharedStyles } from "./shared-styles";
import { variableSource, withVariables, type VariableSource } from "./variables";

export type Prepared = { nodes: Rec[]; variables: VariableSource | undefined };

export const preparedNodes = (nodes: Rec[]): Prepared => {
  const styled = withSharedStyles(nodes);
  const variables = variableSource(styled);
  return { nodes: withVariables(styled, variables), variables };
};
