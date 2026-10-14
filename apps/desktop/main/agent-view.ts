import type { AgentView } from "../shared/api";
import { isId, isTarget } from "../shared/edit-guards";

const optionalId = (value: unknown): value is string | undefined => value === undefined || isId(value);

export const pickAgentView = (value: unknown): AgentView | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const pageId = "pageId" in value ? value.pageId : undefined;
  const screenId = "screenId" in value ? value.screenId : undefined;
  const target = "target" in value ? value.target : undefined;
  if (!optionalId(pageId) || !optionalId(screenId) || (target !== undefined && !isTarget(target))) return undefined;
  return { ...(pageId ? { pageId } : {}), ...(screenId ? { screenId } : {}), ...(target ? { target } : {}) };
};
