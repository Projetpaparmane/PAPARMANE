import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime, STATUS_LABELS } from "@/lib/format";
import { getSessionUser } from "@/lib/supabase/clients";
import { markPickedUp } from "./actions";

export const metadata = { title: "Remise du dossard" };

type Props = { params: Promise<{ token: string }> };

type Row = {
  id: string;
  status: string;
  bib_number: number | null;
  first_name: string;
  last_name: string;
  tshirt_size: string | null;
  picked_up_at: string | null;
  qr_token: string;
  events: { name: string; slug: string; organization_id: string } | null;
  races: { name: string } | null;
};

// Page ouverte en scannant le code QR du dossard. Les règles d'accès la limitent à l'organisation.
export default async function PickupPage({ params }: Props) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { token } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/connexion?next=/organisateur/dossard/${token}`);

  const { data } = await supabase
    .from("registrations")
    .select("id, status, bib_number, first_name, last_name, tshirt_size, picked_up_at, qr_token, events (name, slug, organization_id), races (name)")
    .eq("qr_token", token)
    .maybeSingle();
  const reg = data as unknown as Row | null;
  if (!reg) notFound();

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", reg.events?.organization_id ?? "")
    .maybeSingle();
  if (!member) {
    return (
      <div className="container narrow stack">
        <h1 className="h2">Réservé à l’organisation</h1>
        <p>Ce code sert à la remise des dossards. Ton dossard numérique est dans ton compte.</p>
        <Link className="btn btn-dark" href="/moi">
          Mes inscriptions
        </Link>
      </div>
    );
  }

  const paid = reg.status === "paid";

  return (
    <div className="container narrow stack-lg">
      {reg.events ? (
        <Link href={`/organisateur/${reg.events.slug}`} className="back-link">
          ← {reg.events.name}
        </Link>
      ) : null}
      <section className="bib-card">
        <div className="bib-band">
          <span>{reg.races?.name}</span>
          <span>{STATUS_LABELS[reg.status]}</span>
        </div>
        <p className="bib-number-large">{reg.bib_number ?? "—"}</p>
        <p className="bib-name">
          {reg.first_name} {reg.last_name}
        </p>
        <p className="center">
          T-shirt : <strong>{reg.tshirt_size ?? "—"}</strong>
        </p>
      </section>

      {!paid ? (
        <p className="notice notice-error" role="alert">
          Cette inscription n’est pas payée : ne remettez pas de dossard.
        </p>
      ) : reg.picked_up_at ? (
        <p className="notice notice-success" role="status">
          Dossard déjà remis le {formatDateTime(reg.picked_up_at)}.
        </p>
      ) : (
        <form action={markPickedUp}>
          <input type="hidden" name="token" value={reg.qr_token} />
          <button type="submit" className="btn btn-primary btn-block">
            Confirmer la remise du dossard
          </button>
        </form>
      )}
    </div>
  );
}
