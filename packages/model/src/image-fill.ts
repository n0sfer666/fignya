import type { Color } from "./color";
import type { ImageFill } from "./node";

export const isImageFill = (fill: Color | ImageFill): fill is ImageFill => "hash" in fill;
