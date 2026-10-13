import { For, Show } from "solid-js";
import { inspect } from "@fignya/model";
import type { RenderedNode } from "@fignya/render-dom";
import { imageUrl } from "../../shared/urls";
import { InspectorRows } from "./inspector-rows";

export type InspectorProps = { selected: RenderedNode | undefined };

export const Inspector = (props: InspectorProps) => {
  const inspection = () => props.selected && inspect(props.selected.node, props.selected.component, imageUrl);
  return (
    <aside class="inspector">
      <Show when={inspection()} fallback={<p class="empty">Select a layer</p>}>
        {(current) => (
          <>
            <InspectorRows title="Layer" rows={current().layer} />
            <For each={current().sections}>{(section) => <InspectorRows title={section.title} rows={section.rows} />}</For>
          </>
        )}
      </Show>
    </aside>
  );
};
