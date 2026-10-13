import type { SearchHit } from "@fignya/model";

export type SearchRowProps = { hit: SearchHit; active: boolean; onPick: () => void };

const metaOf = (hit: SearchHit): string =>
  [hit.target.at(-1) ?? "", hit.kind, ...(hit.hidden ? ["hidden"] : []), ...(hit.place ? [] : ["not on a screen"])].join(" · ");

export const SearchRow = (props: SearchRowProps) => {
  const trail = () => props.hit.trail.join(" / ");
  return (
    <li classList={{ active: props.active, unreachable: !props.hit.place }} onMouseDown={(e) => e.preventDefault()} onClick={() => props.onPick()}>
      <span class="trail" title={trail()}>
        {trail()}
      </span>
      <span class="meta">{metaOf(props.hit)}</span>
    </li>
  );
};
