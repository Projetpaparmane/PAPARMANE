import { describe, expect, it } from "vitest";
import { parseRegistration } from "./registration";

const VALID = {
  eventSlug: "trail-des-cretes-2026",
  raceId: "8b0c6c5e-2f3a-4d6b-9a51-0c1d2e3f4a5b",
  firstName: " Julie ",
  lastName: "Gagnon",
  email: "Julie.Gagnon@Exemple.com",
  birthDate: "1988-04-12",
  gender: "",
  phone: "",
  city: "Québec",
  tshirtSize: "M",
  emergencyContactName: "Marc Gagnon",
  emergencyContactPhone: "514-555-0100",
  waiver: "on",
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseRegistration", () => {
  it("accepte une inscription complète et nettoie les valeurs", () => {
    const result = parseRegistration(form(VALID));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.firstName).toBe("Julie");
    expect(result.data.email).toBe("julie.gagnon@exemple.com");
    expect(result.data.gender).toBeUndefined();
    expect(result.data.phone).toBeUndefined();
    expect(result.data.newsletter).toBeUndefined();
  });

  it("exige la décharge", () => {
    const withoutWaiver: Record<string, string> = { ...VALID };
    delete withoutWaiver.waiver;
    const result = parseRegistration(form(withoutWaiver));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.waiver?.[0]).toMatch(/décharge/);
  });

  it("refuse une date de naissance impossible", () => {
    const result = parseRegistration(form({ ...VALID, birthDate: "1988-02-30" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.birthDate).toBeDefined();
  });

  it("signale chaque champ obligatoire manquant", () => {
    const result = parseRegistration(form({ eventSlug: "x", waiver: "on" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ["birthDate", "email", "emergencyContactName", "emergencyContactPhone", "firstName", "lastName", "raceId", "tshirtSize"].sort(),
    );
  });

  it("garde le consentement à l'infolettre seulement s'il est coché", () => {
    const result = parseRegistration(form({ ...VALID, newsletter: "on" }));
    expect(result.ok && result.data.newsletter).toBe("on");
  });
});
