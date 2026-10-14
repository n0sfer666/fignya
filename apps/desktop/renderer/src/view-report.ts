import type { NodeId } from "@fignya/model";
import type { AgentView } from "../../shared/api";

export type ViewReport = {
  page: (pageId: string | undefined) => void;
  live: (screenId: string | undefined) => void;
  selected: (target: NodeId[] | undefined) => void;
};

export const createViewReport = (send: (view: AgentView) => void): ViewReport => {
  let pageId: string | undefined;
  let screenId: string | undefined;
  let target: NodeId[] | undefined;
  const report = (): void => send({ ...(pageId ? { pageId } : {}), ...(screenId ? { screenId } : {}), ...(target ? { target } : {}) });
  return {
    page: (next) => {
      pageId = next;
      report();
    },
    live: (next) => {
      screenId = next;
      report();
    },
    selected: (next) => {
      target = next;
      report();
    },
  };
};
