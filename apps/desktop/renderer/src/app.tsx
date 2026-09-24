import { createResource, createSignal, Match, onCleanup, Switch } from "solid-js";
import { ImportStatus } from "./import-status";
import { Sidebar } from "./sidebar";
import { Workspace } from "./workspace";

export const App = () => {
  const [state] = createResource(() => window.fignya.documentState());
  const [pageId, setPageId] = createSignal<string>();
  const [focus, setFocus] = createSignal<{ id: string }>();
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
  return (
    <Switch>
      <Match when={state.loading}>
        <ImportStatus />
      </Match>
      <Match when={error()}>{(message) => <div class="status error">{message()}</div>}</Match>
      <Match when={state()?.status === "ready"}>
        <div class="layout">
          <Sidebar pages={pages()} pageId={page()?.id} onPage={choosePage} onScreen={(id) => setFocus({ id })} />
          <Workspace page={page()} focusId={focus()?.id} />
        </div>
      </Match>
    </Switch>
  );
};
