export const fitScale = (screenWidth: number, available: number): number =>
  screenWidth > 0 && available > 0 ? Math.min(1, available / screenWidth) : 1;
