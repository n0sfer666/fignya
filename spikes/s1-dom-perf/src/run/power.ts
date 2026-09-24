const pmset = (args: string[]): string => new TextDecoder().decode(Bun.spawnSync(["pmset", ...args]).stdout);

export const powerWarnings = (): string[] => [
  ...(/lowpowermode\s+1/.test(pmset(["-g"])) ? ["Low Power Mode is on: WebKit caps rAF at 30 fps"] : []),
  ...(pmset(["-g", "batt"]).includes("'Battery Power'") ? ["running on battery: plug in AC power"] : []),
];
