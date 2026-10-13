import { describe, expect, it } from "vitest";
import { exportFolderName } from "../main/export-folder-name";

describe("exportFolderName", () => {
  it("keeps readable screen names", () => {
    expect(exportFolderName("Главная — iPhone 15")).toBe("Главная — iPhone 15");
  });

  it("replaces path separators and reserved characters", () => {
    expect(exportFolderName("a/b\\c:d*e?f\"g<h>i|j\u0001")).toBe("a-b-c-d-e-f-g-h-i-j-");
    expect(exportFolderName("..")).toBe("screen");
    expect(exportFolderName("  ")).toBe("screen");
  });

  it("caps long names", () => {
    expect(exportFolderName("x".repeat(300))).toHaveLength(120);
  });

  it("cuts by characters, not UTF-16 units, and trims the cut", () => {
    expect(exportFolderName(`${"x".repeat(119)}😀tail`)).toBe(`${"x".repeat(119)}😀`);
    expect(exportFolderName(`${"x".repeat(119)} tail`)).toBe("x".repeat(119));
  });

  it("does not hide the folder behind a leading dot", () => {
    expect(exportFolderName(".Draft")).toBe("Draft");
    expect(exportFolderName(". . Draft")).toBe("Draft");
  });
});
