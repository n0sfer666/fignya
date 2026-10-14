import { createEffect, onCleanup, onMount } from "solid-js";
import type { Page, Screen, ScreenModel } from "@fignya/model";
import { renderScreen } from "@fignya/render-dom";
import type { FontFaces } from "../../shared/fonts";
import { imageUrl } from "../../shared/urls";
import { createPageCanvas, type PageCanvas, type SelectNode } from "./canvas/page-canvas";
import { bindExport } from "./export-binding";
import { exportLive } from "./export-live";
import type { Focus } from "./focus";
import { applyFaces } from "./fonts/apply-faces";
import { historyStep, inTextField } from "./history-step";
import { bindPlay } from "./play/play-binding";
import { startPlay } from "./play/play-session";

export type WorkspaceProps = { page: Page | undefined; screens: Screen[]; focus: Focus | undefined; onSelect: SelectNode };

const loadScreen = (screen: Screen): Promise<ScreenModel | undefined> => window.fignya.screen(screen.id);

const paintScreen = (model: ScreenModel): HTMLElement => renderScreen(model, { imageUrl });

const openScreen = async (screen: Screen): Promise<HTMLElement | undefined> => {
  const model = await loadScreen(screen);
  return model ? paintScreen(model) : undefined;
};

export const Workspace = (props: WorkspaceProps) => {
  let el: HTMLDivElement | undefined;
  let canvas: PageCanvas | undefined;
  onMount(() => {
    const exporting = bindExport(window.fignya, () => props.page?.screens ?? [], exportLive);
    onCleanup(exporting.dispose);
    let live: string | undefined;
    let inPlay = false;
    const playing = bindPlay(
      window.fignya,
      () => props.screens,
      (screen, onExit) => startPlay(screen, { screens: new Map(props.screens.map((s) => [s.id, s])), load: loadScreen, paint: paintScreen }, onExit),
      (on) => {
        inPlay = on;
        exporting.onLive(on ? undefined : live);
      },
    );
    onCleanup(playing.dispose);
    const onLive = (screenId: string | undefined): void => {
      live = screenId;
      if (!inPlay) exporting.onLive(screenId);
      playing.onLive(screenId);
    };
    if (el) canvas = createPageCanvas(el, openScreen, window.fignya.focusScreens, (node) => props.onSelect(node), onLive);
    const refonted = (faces: FontFaces): void => {
      applyFaces(faces);
      canvas?.reload(faces.version);
    };
    window.fignya.fontFaces().then(refonted, (error: unknown) => console.error(`fignya: font cache: ${String(error)}`));
    onCleanup(window.fignya.onFontFaces(refonted));
    onCleanup(
      window.fignya.onCanvasZoom((step) => {
        if (!inPlay) canvas?.zoomStep(step);
      }),
    );
    onCleanup(window.fignya.onChanged((change) => void canvas?.changed(change)));
    const keydown = (e: KeyboardEvent): void => {
      const step = historyStep(e);
      if (!step) return;
      e.preventDefault();
      if (inTextField(e.target)) document.execCommand(step);
      else window.fignya.step(step);
    };
    window.addEventListener("keydown", keydown);
    onCleanup(() => window.removeEventListener("keydown", keydown));
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
