import { For } from "solid-js";
import type { Page } from "@fignya/model";

export type SidebarProps = {
  pages: Page[];
  pageId: string | undefined;
  onPage: (id: string) => void;
  onScreen: (id: string) => void;
};

export const Sidebar = (props: SidebarProps) => {
  const current = () => props.pages.find((p) => p.id === props.pageId);
  return (
    <aside class="sidebar">
      <h2>Pages</h2>
      <ul class="pages">
        <For each={props.pages}>
          {(page) => (
            <li classList={{ active: page.id === props.pageId }} onClick={() => props.onPage(page.id)}>
              {page.name} <span class="count">{page.screens.length}</span>
            </li>
          )}
        </For>
      </ul>
      <h2>Screens</h2>
      <ul class="screens">
        <For each={current()?.screens ?? []}>{(screen) => <li onClick={() => props.onScreen(screen.id)}>{screen.name}</li>}</For>
      </ul>
    </aside>
  );
};
