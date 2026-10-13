import type { FignyaApi } from "../../shared/api";

declare global {
  interface Window {
    fignya: FignyaApi;
  }
}
