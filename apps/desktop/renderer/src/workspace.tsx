import { createEffect, onCleanup, onMount } from "solid-js";
import type { Page, Screen } from "@fignya/model";
import { renderScreen } from "@fignya/render-dom";
import type { FontFaces } from "../../shared/fonts";
import { imageUrl } from "../../shared/urls";
import { createPageCanvas, type PageCanvas, type SelectNode } from "./canvas/page-canvas";
import type { Focus } from "./focus";
import { applyFaces } from "./fonts/apply-faces";

export type WorkspaceProps = { page: Page | undefined; focus: Focus | undefined; onSelect: SelectNode };

const openScreen = async (screen: Screen): Promise<HTMLElement | undefined> => {
  const model = await window.fignya.screen(screen.id);
  return model ? renderScreen(model, { imageUrl }) : undefined;
};

export const Workspace = (props: WorkspaceProps) => {
  let el: HTMLDivElement | undefined;
  let canvas: PageCanvas | undefined;
  onMount(() => {
    if (el) canvas = createPageCanvas(el, openScreen, window.fignya.focusScreens, (node) => props.onSelect(node));
    const refonted = (faces: FontFaces): void => {
      applyFaces(faces);
      canvas?.reload(faces.version);
    };
    window.fignya.fontFaces().then(refonted, (error: unknown) => console.error(`fignya: font cache: ${String(error)}`));
    onCleanup(window.fignya.onFontFaces(refonted));
    onCleanup(window.fignya.onCanvasZoom((step) => canvas?.zoomStep(step)));
  });
  onCleanup(() => canvas?.dispose());
  createEffect(() => {
    if (!props.page) return;
    window.fignya.showPage(props.page.id);
    canvas?.show(props.page);
  });
  createEffect(() => {
    const focus = props.focus;
    if (!focus) return;
    canvas?.focus(focus.id);
    void canvas?.open(focus.id).then(() => {
      if (props.focus === focus) canvas?.mark(focus.id, focus.target);
    });
  });
  return <main class="workspace" ref={el} />;
};
