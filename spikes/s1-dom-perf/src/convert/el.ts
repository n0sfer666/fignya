export type SvgPath = { d: string; fill: string; rule: "nonzero" | "evenodd" };

export type El = {
  css: string;
  text?: string;
  svg?: SvgPath[];
  kids?: El[];
};
