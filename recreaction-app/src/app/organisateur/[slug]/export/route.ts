import { toCsv } from "@/lib/csv";
import { isSupabaseConfigured } from "@/lib/env";
import { STATUS_LABELS } from "@/lib/format";
import { getStaffEvent } from "@/lib/staff";
import type { Registration } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured()) return new Response("Configuration à terminer", { status: 503 });
  const { slug } = await params;
  const { supabase, event } = await getStaffEvent(slug, `/organisateur/${slug}`);
  if (!event) return new Response("Introuvable", { status: 404 });

  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "paid")
    .order("bib_number");
  if (error) return new Response("Erreur", { status: 500 });

  const raceName = new Map(event.races.map((r) => [r.id, r.name]));
  const rows = (data ?? []) as Registration[];
  const csv = toCsv([
    ["Dossard", "Prénom", "Nom", "Distance", "Courriel", "Téléphone", "Naissance", "Catégorie", "Ville", "T-shirt", "Contact d'urgence", "Téléphone d'urgence", "Infolettre", "Statut", "Total payé", "Dossard remis"],
    ...rows.map((r) => [
      r.bib_number,
      r.first_name,
      r.last_name,
      raceName.get(r.race_id),
      r.email,
      r.phone,
      r.birth_date,
      r.gender,
      r.city,
      r.tshirt_size,
      r.emergency_contact_name,
      r.emergency_contact_phone,
      r.newsletter_opt_in ? "oui" : "non",
      STATUS_LABELS[r.status],
      (r.total_cents / 100).toFixed(2).replace(".", ","),
      r.picked_up_at ? "oui" : "non",
    ]),
  ]);

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscriptions-${event.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
