import { describe, expect, it } from "vitest";
import { safeNextPath } from "./paths";

describe("safeNextPath", () => {
  it("garde les chemins internes", () => {
    expect(safeNextPath("/moi/dossard/abc")).toBe("/moi/dossard/abc");
  });

  it("refuse les adresses vers un autre site", () => {
    expect(safeNextPath("https://exemple.com")).toBe("/moi");
    expect(safeNextPath("//exemple.com")).toBe("/moi");
    expect(safeNextPath("/\\exemple.com")).toBe("/moi");
    expect(safeNextPath(null)).toBe("/moi");
  });
});
