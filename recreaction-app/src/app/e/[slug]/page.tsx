import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConfigNotice from "@/components/ConfigNotice";
import { getEventBySlug, isRegistrationOpen } from "@/lib/data";
import { isPaymentConfigured, isSupabaseConfigured } from "@/lib/env";
import { formatEventDate } from "@/lib/format";
import RegistrationForm from "./RegistrationForm";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ annule?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Inscription" };
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event ? `Inscription · ${event.name}` : "Événement introuvable" };
}

export default async function EventPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { slug } = await params;
  const { annule } = await searchParams;
  const event = await getEventBySlug(slug);
  if (!event || !event.published) notFound();

  const open = isRegistrationOpen(event);

  return (
    <div className="container narrow stack-lg">
      <header className="event-banner">
        <div className="date-tile" aria-hidden="true">
          <span>{new Date(`${event.starts_on}T12:00:00Z`).getUTCDate()}</span>
          <span>{new Intl.DateTimeFormat("fr-CA", { month: "short", timeZone: "UTC" }).format(new Date(`${event.starts_on}T12:00:00Z`)).replace(".", "").toUpperCase()}</span>
        </div>
        <div>
          <h1 className="event-title">{event.name}</h1>
          <p className="event-meta">
            {formatEventDate(event.starts_on)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
      </header>
      {event.tagline ? <p className="lead">{event.tagline}</p> : null}

      {annule ? (
        <p className="notice notice-warning" role="status">
          Paiement annulé : ton inscription n’est pas complétée. Tu peux recommencer quand tu veux.
        </p>
      ) : null}

      {!open ? (
        <p className="notice">Les inscriptions à cet événement sont fermées.</p>
      ) : !isPaymentConfigured() ? (
        <p className="notice">Les inscriptions en ligne ouvriront bientôt.</p>
      ) : (
        <RegistrationForm
          eventSlug={event.slug}
          eventName={event.name}
          races={event.races}
          feeCents={event.service_fee_cents}
          taxable={event.taxable}
          waiverText={event.waiver_text}
        />
      )}
    </div>
  );
}
