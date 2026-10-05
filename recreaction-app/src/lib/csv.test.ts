import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("sépare par des points-virgules et des fins de ligne Windows", () => {
    expect(toCsv([["Dossard", "Nom"], [1001, "Gagnon"]])).toBe("Dossard;Nom\r\n1001;Gagnon");
  });

  it("protège les valeurs qui contiennent un séparateur, un guillemet ou un saut de ligne", () => {
    expect(toCsv([["a;b", 'il dit "go"', "ligne\nsuivante"]])).toBe('"a;b";"il dit ""go""";"ligne\nsuivante"');
  });

  it("laisse vides les valeurs absentes", () => {
    expect(toCsv([[null, undefined, 0]])).toBe(";;0");
  });
});
