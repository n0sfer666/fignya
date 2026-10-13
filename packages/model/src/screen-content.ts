import type { Box, Screen } from "./document";

export const contentOf = (screen: Screen): Box => screen.content ?? { x: 0, y: 0, width: screen.width, height: screen.height };
