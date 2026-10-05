const longDate = new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDateTime = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" });

// Les dates d'événement (AAAA-MM-JJ) n'ont pas d'heure : on les lit en UTC pour ne pas changer de jour.
export function formatEventDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return shortDateTime.format(new Date(iso));
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Paiement en attente",
  paid: "Confirmée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};
