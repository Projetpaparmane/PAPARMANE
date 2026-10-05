import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatEventDate, STATUS_LABELS } from "@/lib/format";
import { getSessionUser } from "@/lib/supabase/clients";

export const metadata = { title: "Mon compte" };

type Row = {
  id: string;
  status: string;
  bib_number: number | null;
  first_name: string;
  events: { name: string; slug: string; starts_on: string; location: string | null } | null;
  races: { name: string } | null;
};

export default async function AccountPage() {
  // Rendu à chaque visite : la configuration et les données ne sont pas figées au moment du build.
  await connection();
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/connexion?next=/moi");

  const { data } = await supabase
    .from("registrations")
    .select("id, status, bib_number, first_name, events (name, slug, starts_on, location), races (name)")
    .in("status", ["paid", "pending"])
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const { data: memberships } = await supabase.from("organization_members").select("organization_id").limit(1);

  return (
    <div className="container narrow stack-lg">
      <div className="stack-sm">
        <h1 className="h1">Mes inscriptions</h1>
        <p className="muted">Compte : {user.email}</p>
      </div>

      {rows.length === 0 ? (
        <div className="card stack-sm">
          <p>Aucune inscription liée à ce courriel pour l’instant.</p>
          <p className="small muted">Ton inscription utilise une autre adresse ? Déconnecte-toi, puis reconnecte-toi avec celle-là.</p>
        </div>
      ) : (
        <ul className="stack list-reset">
          {rows.map((r) => (
            <li key={r.id}>
              {r.status === "paid" ? (
                <Link href={`/moi/dossard/${r.id}`} className="registration-card">
                  <span className="registration-bib">{r.bib_number ?? "—"}</span>
                  <span className="stack-xs">
                    <strong>{r.events?.name}</strong>
                    <span className="small muted">
                      {r.races?.name} · {r.events ? formatEventDate(r.events.starts_on) : ""}
                    </span>
                    <span className="small">{r.first_name} · voir mon dossard et ma fiche médicale</span>
                  </span>
                </Link>
              ) : (
                <div className="registration-card registration-card-pending">
                  <span className="registration-bib">…</span>
                  <span className="stack-xs">
                    <strong>{r.events?.name}</strong>
                    <span className="small muted">
                      {r.races?.name} · {STATUS_LABELS[r.status]}
                    </span>
                    {r.events ? (
                      <Link className="small" href={`/e/${r.events.slug}`}>
                        Reprendre l’inscription
                      </Link>
                    ) : null}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {memberships && memberships.length > 0 ? (
        <Link href="/organisateur" className="btn btn-dark">
          Espace organisateur
        </Link>
      ) : null}

      <form action="/auth/deconnexion" method="post">
        <button type="submit" className="btn btn-ghost">
          Me déconnecter
        </button>
      </form>
    </div>
  );
}
