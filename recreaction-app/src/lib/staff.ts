import "server-only";
import { redirect } from "next/navigation";
import { getEventBySlug } from "@/lib/data";
import { getSessionUser } from "@/lib/supabase/clients";

// Retourne l'événement si la personne connectée fait partie de son organisation, sinon null.
export async function getStaffEvent(slug: string, nextPath: string) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(nextPath)}`);

  const event = await getEventBySlug(slug, supabase);
  if (!event) return { supabase, user, event: null };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, event: member ? event : null };
}
