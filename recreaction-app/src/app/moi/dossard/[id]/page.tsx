import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatEventDate } from "@/lib/format";
import { getOrigin } from "@/lib/origin";
import { getSessionUser } from "@/lib/supabase/clients";
import type { MedicalCard } from "@/lib/types";
import MedicalCardForm from "./MedicalCardForm";

export const metadata = { title: "Mon dossard" };

type Props = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  status: string;
  bib_number: number | null;
  first_name: string;
  last_name: string;
  qr_token: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  events: { name: string; starts_on: string; location: string | null } | null;
  races: { name: string } | null;
};

export default async function BibPage({ params }: Props) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/connexion?next=/moi/dossard/${id}`);

  const { data } = await supabase
    .from("registrations")
    .select(
      "id, status, bib_number, first_name, last_name, qr_token, emergency_contact_name, emergency_contact_phone, events (name, starts_on, location), races (name)",
    )
    .eq("id", id)
    .eq("status", "paid")
    .maybeSingle();
  const reg = data as unknown as Row | null;
  if (!reg) notFound();

  const { data: card } = await supabase.from("medical_cards").select("*").eq("registration_id", id).maybeSingle();

  // Le code QR mène à la fiche de remise du dossard, accessible à l'organisation seulement.
  const qrUrl = `${await getOrigin()}/organisateur/dossard/${reg.qr_token}`;
  const qrSvg = await QRCode.toString(qrUrl, { type: "svg", margin: 1, color: { dark: "#14201B", light: "#FFFFFF" } });

  return (
    <div className="container narrow stack-lg">
      <Link href="/moi" className="back-link">
        ← Mes inscriptions
      </Link>

      <section className="bib-card" aria-label="Dossard numérique">
        <div className="bib-band">
          <span>{reg.events?.name}</span>
          <span>{reg.races?.name}</span>
        </div>
        <p className="bib-number-large">{reg.bib_number}</p>
        <p className="bib-name">
          {reg.first_name} {reg.last_name}
        </p>
        <div className="bib-qr" role="img" aria-label={`Code QR du dossard ${reg.bib_number}`} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="small muted center">
          {reg.events ? formatEventDate(reg.events.starts_on) : ""}
          {reg.events?.location ? ` · ${reg.events.location}` : ""}
        </p>
        <p className="small muted center">Présente ce code à la remise des dossards.</p>
      </section>

      <section className="card stack">
        <div className="stack-xs">
          <h2 className="h3">Fiche médicale d’urgence</h2>
          <p className="small muted">
            Visible par toi seulement dans l’app. Elle sert à l’équipe médicale en cas d’urgence et est supprimée automatiquement 30 jours
            après l’événement.
          </p>
        </div>
        <p className="small">
          Personne à joindre : <strong>{reg.emergency_contact_name}</strong> · {reg.emergency_contact_phone}
        </p>
        <MedicalCardForm registrationId={reg.id} card={(card as MedicalCard | null) ?? null} />
      </section>
    </div>
  );
}
