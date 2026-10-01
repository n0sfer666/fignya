import { createMemo, createResource, createSignal, For, onCleanup, Show } from "solid-js";
import type { FontDownload, FontFaces, FontRequest } from "../../../shared/fonts";
import { canvasMeasure } from "./canvas-measure";
import { isInstalled } from "./font-presence";
import { fontReport, fontRequests, mergeResults, requestBatches, type FontRow, type FontStatus } from "./font-report";

const STATUS: Record<FontStatus, string> = {
  missing: "missing",
  downloaded: "downloaded",
  unavailable: "not on Google Fonts",
  failed: "download failed",
};

const statusOf = (row: FontRow): string => (row.unavailableFaces > 0 && row.status === "downloaded" ? `${STATUS.downloaded}, ${row.unavailableFaces} styles unavailable` : STATUS[row.status]);

const downloadBatch = async (batch: FontRequest[]): Promise<FontDownload[]> => {
  try {
    return await window.fignya.downloadFonts(batch);
  } catch (error) {
    console.error(`fignya: font download: ${String(error)}`);
    return batch.map((r) => ({ family: r.family, status: "failed", missingFaces: r.faces.length }));
  }
};

export const FontsPanel = () => {
  const [usage] = createResource(() => window.fignya.documentFonts());
  const [faces, setFaces] = createSignal<FontFaces>({ version: "", faces: [] });
  const [results, setResults] = createSignal<FontDownload[]>([]);
  const [busy, setBusy] = createSignal(false);
  window.fignya.fontFaces().then(setFaces, (error: unknown) => console.error(`fignya: font cache: ${String(error)}`));
  onCleanup(window.fignya.onFontFaces(setFaces));
  const measure = canvasMeasure();
  const presence = new Map<string, boolean>();
  const installed = (family: string): boolean => presence.get(family) ?? presence.set(family, isInstalled(family, measure)).get(family) ?? false;
  const rows = createMemo(() => fontReport(usage.error ? [] : (usage() ?? []), faces().faces, installed, results()));
  const requests = () => fontRequests(rows());
  const download = async (): Promise<void> => {
    setBusy(true);
    for (const batch of requestBatches(rows())) {
      const done = await downloadBatch(batch);
      setResults((earlier) => mergeResults(earlier, done));
    }
    setBusy(false);
  };
  return (
    <Show when={usage.loading || rows().length > 0}>
      <h2>Fonts</h2>
      <ul class="fonts">
        <Show when={usage.loading}>
          <li class="count">Checking…</li>
        </Show>
        <For each={rows()}>
          {(row) => (
            <li title={`${row.family}: ${statusOf(row)}`}>
              {row.family} <span class="count">{row.nodes}</span> <span classList={{ "font-status": true, [row.status]: true }}>{statusOf(row)}</span>
            </li>
          )}
        </For>
      </ul>
      <Show when={requests().length > 0}>
        <button class="fonts-download" disabled={busy()} onClick={() => void download()}>
          {busy() ? "Downloading…" : "Download from Google Fonts"}
        </button>
      </Show>
    </Show>
  );
};
