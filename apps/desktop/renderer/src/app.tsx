import { batch, createResource, createSignal, Match, onCleanup, Switch } from "solid-js";
import type { NodeId, SearchPlace } from "@fignya/model";
import type { Focus } from "./focus";
import { ImportStatus } from "./import-status";
import { SearchBox } from "./search-box";
import { Sidebar } from "./sidebar";
import { Workspace } from "./workspace";

export const App = () => {
  const [state] = createResource(() => window.fignya.documentState());
  const [pageId, setPageId] = createSignal<string>();
  const [focus, setFocus] = createSignal<Focus>();
  const pages = () => {
    const current = state();
    return current?.status === "ready" ? current.pages : [];
  };
  const [lost, setLost] = createSignal<string>();
  onCleanup(window.fignya.onLost((message) => setLost(message)));
  const error = () => {
    const current = state();
    return lost() ?? (current?.status === "error" ? current.message : undefined);
  };
  const page = () => pages().find((p) => p.id === pageId()) ?? pages()[0];
  const choosePage = (id: string): void => {
    setPageId(id);
    setFocus(undefined);
  };
  const pick = (place: SearchPlace, target: NodeId[]): void => {
    batch(() => {
      if (place.pageId !== page()?.id) setPageId(place.pageId);
      setFocus({ id: place.screenId, target });
    });
  };
  return (
    <Switch>
      <Match when={state.loading}>
        <ImportStatus />
      </Match>
      <Match when={error()}>{(message) => <div class="status error">{message()}</div>}</Match>
      <Match when={state()?.status === "ready"}>
        <div class="layout">
          <Sidebar pages={pages()} pageId={page()?.id} onPage={choosePage} onScreen={(id) => setFocus({ id })} />
          <Workspace page={page()} focus={focus()} />
          <SearchBox onPick={pick} />
        </div>
      </Match>
    </Switch>
  );
};
