// Taxes du Québec : TPS 5 % et TVQ 9,975 %, calculées séparément pour les reçus.
export const GST_RATE = 0.05;
export const QST_RATE = 0.09975;

export type Totals = {
  priceCents: number;
  feeCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
};

export function computeTotals(input: { priceCents: number; feeCents: number; taxable: boolean }): Totals {
  const { priceCents, feeCents, taxable } = input;
  // Les frais de service sont toujours taxables ; le prix de l'inscription seulement si l'événement l'est.
  const taxableBase = (taxable ? priceCents : 0) + feeCents;
  const gstCents = Math.round(taxableBase * GST_RATE);
  const qstCents = Math.round(taxableBase * QST_RATE);
  return {
    priceCents,
    feeCents,
    gstCents,
    qstCents,
    totalCents: priceCents + feeCents + gstCents + qstCents,
  };
}

const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });

export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}
