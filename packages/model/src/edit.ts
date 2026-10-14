import type { NodeId } from "./node";
import type { StyleValues } from "./style";

export const EDIT_KEYS = ["left", "top", "width", "height", "opacity", "background", "color", "gap", "padding", "borderRadius", "fontSize", "fontWeight"] as const;

export type EditKey = (typeof EDIT_KEYS)[number];

export type StylePatch = Partial<Pick<StyleValues, EditKey>>;

export type Edit = { target: NodeId[]; style?: StylePatch; text?: string };

export type EditChange = { screenId: NodeId; target: NodeId[] };
