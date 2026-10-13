import { For } from "solid-js";
import type { Declaration } from "@fignya/model";

export type InspectorRowsProps = { title: string; rows: Declaration[] };

export const InspectorRows = (props: InspectorRowsProps) => (
  <section>
    <h2>{props.title}</h2>
    <dl>
      <For each={props.rows}>
        {([name, value]) => (
          <>
            <dt>{name}</dt>
            <dd title={value}>{value}</dd>
          </>
        )}
      </For>
    </dl>
  </section>
);
