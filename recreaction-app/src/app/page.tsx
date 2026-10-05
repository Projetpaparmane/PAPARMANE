import Link from "next/link";
import { connection } from "next/server";
import ConfigNotice from "@/components/ConfigNotice";
import { getUpcomingEvents } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatEventDate } from "@/lib/format";

export default async function Home() {
  // Rendu à chaque visite : la configuration et les données ne sont pas figées au moment du build.
  await connection();
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const events = await getUpcomingEvents();

  return (
    <div className="container stack-lg">
      <section className="hero stack-sm">
        <h1 className="display">Vis l’événement à fond.</h1>
        <p className="lead">Inscris-toi en quelques minutes. Ton dossard numérique et ta fiche médicale t’attendent ensuite dans ton compte.</p>
      </section>

      <section className="stack" aria-labelledby="a-venir">
        <h2 id="a-venir" className="h2">
          Événements à venir
        </h2>
        {events.length === 0 ? (
          <p className="muted">Aucun événement ouvert pour l’instant.</p>
        ) : (
          <ul className="grid-cards list-reset">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/e/${e.slug}`} className="card card-link stack-xs">
                  <strong className="h3">{e.name}</strong>
                  <span className="small muted">
                    {formatEventDate(e.starts_on)}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                  {e.tagline ? <span className="small">{e.tagline}</span> : null}
                  <span className="link-cta">S’inscrire →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
