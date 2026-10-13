import { createSignal, onCleanup } from "solid-js";
import type { ImportProgress } from "@fignya/fig-import";
import { progressPercent } from "../../shared/progress";

export const ImportStatus = () => {
  const [progress, setProgress] = createSignal<ImportProgress>();
  onCleanup(window.fignya.onProgress((next) => setProgress(next)));
  const percent = () => {
    const current = progress();
    return current ? progressPercent(current) : 0;
  };
  return (
    <div class="status">
      <div class="import">
        <span>Importing FIG_FILE… {percent()}%</span>
        <progress max={100} value={percent()} />
      </div>
    </div>
  );
};
