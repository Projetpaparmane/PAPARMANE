import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicSupabase } from "@/lib/supabase/clients";
import type { EventRow, EventWithRaces, Race } from "@/lib/types";

const EVENT_COLUMNS =
  "id, organization_id, slug, name, tagline, location, starts_on, registration_closes_at, service_fee_cents, taxable, waiver_text, published";
const RACE_COLUMNS = "id, event_id, name, description, price_cents, capacity, bib_start, sort";

export async function getUpcomingEvents(): Promise<EventRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await createPublicSupabase()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("published", true)
    .gte("starts_on", today)
    .order("starts_on");
  if (error) throw error;
  return data ?? [];
}

export async function getEventBySlug(slug: string, client?: SupabaseClient): Promise<EventWithRaces | null> {
  const { data, error } = await (client ?? createPublicSupabase())
    .from("events")
    .select(`${EVENT_COLUMNS}, races (${RACE_COLUMNS})`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const races = [...((data as { races: Race[] }).races ?? [])].sort((a, b) => a.sort - b.sort);
  return { ...(data as EventRow), races };
}

export function isRegistrationOpen(event: EventRow, now = new Date()): boolean {
  if (event.registration_closes_at && new Date(event.registration_closes_at) < now) return false;
  return new Date(`${event.starts_on}T23:59:59Z`) >= now;
}

// Places prises : inscriptions payées et paiements commencés depuis moins de 30 minutes.
export async function countTakenSpots(admin: SupabaseClient, raceId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("race_id", raceId)
    .or(`status.eq.paid,and(status.eq.pending,created_at.gte."${since}")`);
  if (error) throw error;
  return count ?? 0;
}
