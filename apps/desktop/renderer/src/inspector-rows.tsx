import { Index, Show } from "solid-js";
import { isEditField, type Declaration, type EditField } from "@fignya/model";
import { InspectorField } from "./inspector-field";

export type CommitField = (field: EditField, input: string) => Promise<boolean>;

export interface InspectorRowsProps {
  title: string;
  rows: Declaration[];
  commit: CommitField;
}

const editField = (name: string): EditField | undefined => (isEditField(name) ? name : undefined);

export const InspectorRows = (props: InspectorRowsProps) => (
  <section>
    <h2>{props.title}</h2>
    <dl>
      <Index each={props.rows}>
        {(row) => (
          <>
            <dt>{row()[0]}</dt>
            <Show when={editField(row()[0])} fallback={<dd title={row()[1]}>{row()[1]}</dd>}>
              {(field) => <InspectorField value={row()[1]} multiline={field() === "text"} commit={(input) => props.commit(field(), input)} />}
            </Show>
          </>
        )}
      </Index>
    </dl>
  </section>
);
