import Link from "next/link";
import { isPaymentConfigured } from "@/lib/env";
import { confirmPaidSession } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const metadata = { title: "Merci!" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function ThanksPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;

  let bib: number | null = null;
  let email: string | null = null;
  let paid = false;

  if (sessionId && isPaymentConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.event_slug === slug) {
        email = session.customer_details?.email ?? session.customer_email ?? null;
        paid = session.payment_status === "paid";
        // N'attend pas le webhook : la confirmation est sans effet si elle a déjà eu lieu.
        if (paid) bib = await confirmPaidSession(session);
      }
    } catch (e) {
      console.error("Session Stripe illisible", e);
    }
  }

  if (!paid) {
    return (
      <div className="container narrow stack">
        <h1 className="h2">Paiement en cours de confirmation</h1>
        <p>Si ton paiement est passé, ton inscription apparaîtra dans ton compte d’ici quelques minutes.</p>
        <Link className="btn btn-dark" href="/connexion">
          Accéder à mon compte
        </Link>
      </div>
    );
  }

  return (
    <div className="container narrow stack-lg">
      <div className="success-card stack">
        <p className="eyebrow">Inscription confirmée</p>
        <h1 className="h1">C’est parti!</h1>
        {bib ? (
          <p className="bib-line">
            Ton dossard : <strong className="bib-number">{bib}</strong>
          </p>
        ) : null}
        <p>Ton reçu est envoyé à {email ?? "ton courriel"}.</p>
      </div>
      <section className="card stack">
        <h2 className="h3">Prochaine étape : ta fiche médicale</h2>
        <p>
          Connecte-toi avec ton courriel pour voir ton dossard numérique et remplir ta fiche médicale d’urgence. Elle est
          visible par toi seulement.
        </p>
        <Link className="btn btn-primary" href={`/connexion${email ? `?courriel=${encodeURIComponent(email)}` : ""}`}>
          Ouvrir mon dossard
        </Link>
      </section>
    </div>
  );
}
