import { Index, Show } from "solid-js";
import { fieldEdit, inspect, isNoopEdit } from "@fignya/model";
import { imageUrl } from "../../shared/urls";
import type { Selected } from "./canvas/live-selection";
import { InspectorRows, type CommitField } from "./inspector-rows";

export interface InspectorProps {
  selected: Selected | undefined;
}

const refused = (error: unknown): boolean => {
  console.error(`fignya: edit failed: ${String(error)}`);
  return false;
};

export const Inspector = (props: InspectorProps) => {
  const layer = () => props.selected?.target.join("/");
  const inspection = () => props.selected && inspect(props.selected.node, props.selected.component, imageUrl);
  const commit: CommitField = async (field, input) => {
    const selected = props.selected;
    const edit = selected && fieldEdit(field, input, selected.node, selected.target);
    if (!selected || !edit) return false;
    if (isNoopEdit(edit, selected.node)) return true;
    return window.fignya.edit(edit).then(() => true, refused);
  };
  return (
    <aside class="inspector">
      <Show when={layer()} keyed fallback={<p class="empty">Select a layer</p>}>
        <Show when={inspection()}>
          {(current) => (
            <>
              <InspectorRows title="Layer" rows={current().layer} commit={commit} />
              <Index each={current().sections}>{(section) => <InspectorRows title={section().title} rows={section().rows} commit={commit} />}</Index>
            </>
          )}
        </Show>
      </Show>
    </aside>
  );
};
