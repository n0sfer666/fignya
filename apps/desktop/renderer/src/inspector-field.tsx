import { createEffect, createSignal, on, Show } from "solid-js";
import { historyStep } from "./history-step";

export interface InspectorFieldProps {
  value: string;
  multiline: boolean;
  commit: (input: string) => Promise<boolean>;
}

type Editor = HTMLInputElement | HTMLTextAreaElement;

export const InspectorField = (props: InspectorFieldProps) => {
  const [invalid, setInvalid] = createSignal(false);
  let sent: string | undefined;
  createEffect(
    on(
      () => props.value,
      () => {
        sent = undefined;
        setInvalid(false);
      },
      { defer: true },
    ),
  );
  const apply = async (el: Editor): Promise<void> => {
    const input = el.value;
    if (input === props.value) setInvalid(false);
    if (input === props.value || input === sent) return;
    sent = input;
    const accepted = await props.commit(input);
    if (sent !== input) return;
    if (!accepted) sent = undefined;
    setInvalid(!accepted);
  };
  const applied = (el: Editor): boolean => el.value === props.value || el.value === sent;
  const keydown = (e: KeyboardEvent, el: Editor): void => {
    if (e.isComposing) return;
    const step = historyStep(e);
    if (step && applied(el)) {
      e.preventDefault();
      e.stopPropagation();
      window.fignya.step(step);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      el.value = props.value;
      setInvalid(false);
      el.blur();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void apply(el);
    }
  };
  return (
    <dd class="field" classList={{ invalid: invalid() }}>
      <Show
        when={props.multiline}
        fallback={<input value={props.value} spellcheck={false} onKeyDown={(e) => keydown(e, e.currentTarget)} onBlur={(e) => void apply(e.currentTarget)} />}
      >
        <textarea value={props.value} rows={2} onKeyDown={(e) => keydown(e, e.currentTarget)} onBlur={(e) => void apply(e.currentTarget)} />
      </Show>
    </dd>
  );
};
