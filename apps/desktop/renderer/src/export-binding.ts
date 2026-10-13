import type { Screen } from "@fignya/model";
import type { FignyaApi } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";

export type ExportApi = Pick<FignyaApi, "exportAvailable" | "exportFailed" | "onExportRequest">;

export type ExportBinding = { onLive: (screenId: string | undefined) => void; dispose: () => void };

export const bindExport = (api: ExportApi, screens: () => Screen[], run: (screen: Screen) => Promise<void>): ExportBinding => {
  let live: string | undefined;
  let running = false;
  const onLive = (screenId: string | undefined): void => {
    live = screenId;
    api.exportAvailable(screenId);
  };
  const off = api.onExportRequest(() => {
    const screen = screens().find((s) => s.id === live);
    if (!screen || running) return;
    running = true;
    run(screen)
      .catch((error: unknown) => api.exportFailed(errorMessage(error)))
      .finally(() => {
        running = false;
      });
  });
  onLive(undefined);
  return {
    onLive,
    dispose: () => {
      off();
      onLive(undefined);
    },
  };
};
