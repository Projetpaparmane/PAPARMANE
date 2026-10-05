import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatEventDate } from "@/lib/format";
import { getSessionUser } from "@/lib/supabase/clients";

export const metadata = { title: "Espace organisateur" };

export default async function OrganizerHome() {
  // Rendu à chaque visite : la configuration et les données ne sont pas figées au moment du build.
  await connection();
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/connexion?next=/organisateur");

  const { data: memberships } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id);
  const orgIds = (memberships ?? []).map((m) => m.organization_id as string);

  const { data: events } = orgIds.length
    ? await supabase
        .from("events")
        .select("id, slug, name, starts_on, location, published")
        .in("organization_id", orgIds)
        .order("starts_on", { ascending: false })
    : { data: [] };

  return (
    <div className="container stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Espace organisateur</p>
        <h1 className="h1">Mes événements</h1>
      </div>
      {orgIds.length === 0 ? (
        <p className="notice">
          Ce compte ({user.email}) n’est relié à aucune organisation. Demandez à l’équipe Récréaction de vous ajouter.
        </p>
      ) : (
        <ul className="grid-cards list-reset">
          {(events ?? []).map((e) => (
            <li key={e.id}>
              <Link href={`/organisateur/${e.slug}`} className="card card-link stack-xs">
                <strong className="h3">{e.name}</strong>
                <span className="small muted">
                  {formatEventDate(e.starts_on)}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
                {!e.published ? <span className="badge">Non publié</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
