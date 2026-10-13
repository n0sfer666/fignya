import { createSignal, For, onCleanup, Show } from "solid-js";
import { parseNodeQuery, type NodeId, type SearchHit, type SearchPlace } from "@fignya/model";
import { SearchRow } from "./search-row";
import { createSearchRunner, type SearchResult } from "./search-runner";

export type SearchBoxProps = { onPick: (place: SearchPlace, target: NodeId[]) => void };

const DEBOUNCE_MS = 120;

const isFind = (e: KeyboardEvent): boolean => (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.code === "KeyF";

const readClipboard = (): Promise<string> => navigator.clipboard.readText().catch(() => "");

export const SearchBox = (props: SearchBoxProps) => {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [result, setResult] = createSignal<SearchResult>({ query: "", hits: [] });
  const [active, setActive] = createSignal(0);
  let input: HTMLInputElement | undefined;
  const runner = createSearchRunner(
    (text) => window.fignya.search(text),
    (next) => {
      setResult(next);
      setActive(0);
    },
    DEBOUNCE_MS,
  );
  const fresh = () => result().query === query();
  const current = () => (fresh() ? result().hits : []);

  const show = async (): Promise<void> => {
    setOpen(true);
    input?.focus();
    input?.select();
    const before = query();
    const clip = (await readClipboard()).trim();
    if (!open() || query() !== before || clip === before || !parseNodeQuery(clip)) return;
    setQuery(clip);
    void runner.now(clip);
    input?.select();
  };
  const pick = (hit: SearchHit | undefined): void => {
    const place = hit?.place;
    if (!open() || !hit || !place) return;
    setOpen(false);
    props.onPick(place, hit.target);
  };
  const submit = (): void => {
    if (fresh()) pick(current()[active()]);
    else void runner.now(query()).then((hits) => pick(hits?.[0]));
  };
  const move = (step: number): void => {
    const count = current().length;
    if (count > 0) setActive((active() + step + count) % count);
  };
  const keydown = (e: KeyboardEvent): void => {
    if (isFind(e)) return;
    e.stopPropagation();
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") submit();
    else if (e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowUp") move(-1);
    else return;
    e.preventDefault();
  };
  const find = (e: KeyboardEvent): void => {
    if (!isFind(e)) return;
    e.preventDefault();
    void show();
  };
  window.addEventListener("keydown", find);
  onCleanup(() => {
    window.removeEventListener("keydown", find);
    runner.dispose();
  });
  const nothing = () => query().trim() !== "" && fresh() && result().hits.length === 0;

  return (
    <Show when={open()}>
      <div class="search">
        <input
          ref={input}
          value={query()}
          placeholder="Node id or Figma link"
          spellcheck={false}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            runner.later(e.currentTarget.value);
          }}
          on:keydown={keydown}
          onBlur={() => {
            if (document.hasFocus()) setOpen(false);
          }}
        />
        <Show when={current().length > 0}>
          <ul>
            <For each={current()}>{(hit, i) => <SearchRow hit={hit} active={i() === active()} onPick={() => pick(hit)} />}</For>
          </ul>
        </Show>
        <Show when={nothing()}>
          <div class="empty">{parseNodeQuery(query()) ? "Nothing found" : "Enter a node id (2479:25954, 2479-25954) or a Figma link"}</div>
        </Show>
      </div>
    </Show>
  );
};
