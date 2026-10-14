const RESERVED = /[/\\:*?"<>|\p{Cc}]/gu;

const MAX_LENGTH = 120;

export const exportFolderName = (name: string): string => {
  const safe = name.replace(RESERVED, "-").replace(/^[\s.]+/, "");
  return Array.from(safe).slice(0, MAX_LENGTH).join("").trimEnd() || "screen";
};
