import { describe, expect, it } from "vitest";
import { computeTotals, formatMoney } from "./pricing";

describe("computeTotals", () => {
  it("taxe l'inscription et les frais quand l'événement est taxable", () => {
    expect(computeTotals({ priceCents: 7500, feeCents: 250, taxable: true })).toEqual({
      priceCents: 7500,
      feeCents: 250,
      gstCents: 388,
      qstCents: 773,
      totalCents: 8911,
    });
  });

  it("ne taxe que les frais de service quand l'événement n'est pas taxable", () => {
    const totals = computeTotals({ priceCents: 7500, feeCents: 250, taxable: false });
    expect(totals.gstCents).toBe(13);
    expect(totals.qstCents).toBe(25);
    expect(totals.totalCents).toBe(7788);
  });

  it("ne crée aucune taxe sans montant taxable", () => {
    expect(computeTotals({ priceCents: 3500, feeCents: 0, taxable: false }).totalCents).toBe(3500);
  });
});

describe("formatMoney", () => {
  it("affiche les montants à la québécoise", () => {
    expect(formatMoney(8911)).toMatch(/^89,11\s\$$/u);
  });
});
