import Link from "next/link";
import { notFound } from "next/navigation";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime, formatEventDate, STATUS_LABELS } from "@/lib/format";
import { formatMoney } from "@/lib/pricing";
import { getStaffEvent } from "@/lib/staff";
import type { Registration } from "@/lib/types";

export const metadata = { title: "Inscriptions" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; statut?: string }>;
};

export default async function OrganizerEventPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { slug } = await params;
  const { q = "", statut = "paid" } = await searchParams;
  const { supabase, event } = await getStaffEvent(slug, `/organisateur/${slug}`);
  if (!event) notFound();

  const { data } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", event.id)
    .order("bib_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const all = (data ?? []) as Registration[];
  const paid = all.filter((r) => r.status === "paid");
  const raceName = new Map(event.races.map((r) => [r.id, r.name]));

  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (r) =>
      (statut === "tous" || r.status === statut) &&
      (!needle ||
        `${r.first_name} ${r.last_name} ${r.email} ${r.bib_number ?? ""}`.toLowerCase().includes(needle)),
  );

  const revenue = paid.reduce((sum, r) => sum + r.total_cents, 0);
  const pickedUp = paid.filter((r) => r.picked_up_at).length;
  const newsletter = paid.filter((r) => r.newsletter_opt_in).length;
  const shirts = new Map<string, number>();
  for (const r of paid) if (r.tshirt_size) shirts.set(r.tshirt_size, (shirts.get(r.tshirt_size) ?? 0) + 1);

  return (
    <div className="container stack-lg">
      <div className="stack-xs">
        <Link href="/organisateur" className="back-link">
          ← Mes événements
        </Link>
        <h1 className="h1">{event.name}</h1>
        <p className="muted">
          {formatEventDate(event.starts_on)}
          {event.location ? ` · ${event.location}` : ""} ·{" "}
          <Link href={`/e/${event.slug}`}>page d’inscription publique</Link>
        </p>
      </div>

      <section className="kpis" aria-label="Indicateurs">
        <div className="kpi">
          <span className="kpi-label">Inscriptions confirmées</span>
          <span className="kpi-value">{paid.length}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Encaissé (taxes et frais compris)</span>
          <span className="kpi-value">{formatMoney(revenue)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Dossards remis</span>
          <span className="kpi-value">
            {pickedUp} / {paid.length}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Abonnés à l’infolettre</span>
          <span className="kpi-value">{newsletter}</span>
        </div>
      </section>

      <section className="card stack-sm" aria-label="Par distance">
        <h2 className="h3">Par distance</h2>
        <ul className="list-reset stack-xs">
          {event.races.map((race) => {
            const count = paid.filter((r) => r.race_id === race.id).length;
            return (
              <li key={race.id} className="race-line">
                <span>{race.name}</span>
                <span className="meter" aria-hidden="true">
                  <span style={{ width: `${race.capacity ? Math.min(100, (count / race.capacity) * 100) : 0}%` }} />
                </span>
                <strong>
                  {count}
                  {race.capacity ? ` / ${race.capacity}` : ""}
                </strong>
              </li>
            );
          })}
        </ul>
        {shirts.size ? (
          <p className="small muted">
            T-shirts :{" "}
            {[...shirts.entries()]
              .sort()
              .map(([size, n]) => `${size} ${n}`)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="card stack">
        <div className="toolbar">
          <h2 className="h3">Participants</h2>
          <a className="btn btn-dark" href={`/organisateur/${event.slug}/export`}>
            Exporter (CSV)
          </a>
        </div>
        <form className="toolbar" role="search">
          <label className="sr-only" htmlFor="q">
            Rechercher
          </label>
          <input id="q" name="q" type="search" placeholder="Nom, courriel ou dossard" defaultValue={q} className="grow" />
          <label className="sr-only" htmlFor="statut">
            Statut
          </label>
          <select id="statut" name="statut" defaultValue={statut}>
            <option value="paid">Confirmées</option>
            <option value="pending">Paiement en attente</option>
            <option value="cancelled">Annulées</option>
            <option value="tous">Toutes</option>
          </select>
          <button type="submit" className="btn btn-ghost">
            Filtrer
          </button>
        </form>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Dossard</th>
                <th scope="col">Nom</th>
                <th scope="col">Distance</th>
                <th scope="col">T-shirt</th>
                <th scope="col">Statut</th>
                <th scope="col">Date d’inscription</th>
                <th scope="col">Remise</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="num">{r.bib_number ?? "—"}</td>
                  <td>
                    <Link href={`/organisateur/dossard/${r.qr_token}`}>
                      {r.first_name} {r.last_name}
                    </Link>
                    <div className="small muted">{r.email}</div>
                  </td>
                  <td>{raceName.get(r.race_id)}</td>
                  <td>{r.tshirt_size ?? "—"}</td>
                  <td>{STATUS_LABELS[r.status]}</td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td>{r.picked_up_at ? "Remis" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? <p className="muted small">Aucune inscription ne correspond.</p> : null}
        </div>
      </section>
    </div>
  );
}
