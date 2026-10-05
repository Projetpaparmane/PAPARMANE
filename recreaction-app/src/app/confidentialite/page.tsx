export const metadata = { title: "Politique de confidentialité" };

// Brouillon à faire valider par un conseiller juridique avant l'ouverture des inscriptions.
export default function PrivacyPage() {
  return (
    <article className="container narrow stack prose">
      <h1 className="h1">Politique de confidentialité</h1>
      <p className="notice notice-warning">Version préliminaire, en cours de validation.</p>

      <h2 className="h3">Responsable de la protection des renseignements personnels</h2>
      <p>[Nom de la personne responsable] · [courriel de contact]</p>

      <h2 className="h3">Ce que nous recueillons et pourquoi</h2>
      <ul>
        <li>Coordonnées, date de naissance et taille de t-shirt : pour gérer ton inscription et ta catégorie.</li>
        <li>Personne à joindre en cas d’urgence : pour ta sécurité pendant l’événement.</li>
        <li>Fiche médicale (facultative) : seulement pour l’équipe médicale en cas d’urgence.</li>
        <li>Paiement : traité par Stripe. Nous ne voyons ni ne conservons ton numéro de carte.</li>
      </ul>

      <h2 className="h3">Ta fiche médicale</h2>
      <p>
        Elle est visible par toi seulement dans l’app. L’équipe médicale y aura accès seulement en cas d’urgence, et chaque
        consultation sera journalisée. Elle est supprimée automatiquement 30 jours après l’événement.
      </p>

      <h2 className="h3">Infolettre</h2>
      <p>Tu la reçois seulement si tu as coché la case. Chaque envoi contient un lien de désabonnement.</p>

      <h2 className="h3">Partage</h2>
      <p>
        L’organisateur de l’événement voit les renseignements de ton inscription. Les commanditaires ne reçoivent jamais tes
        coordonnées.
      </p>

      <h2 className="h3">Hébergement</h2>
      <p>[Région d’hébergement de la base de données, par exemple : Canada (Montréal)]</p>

      <h2 className="h3">Tes droits</h2>
      <p>Tu peux demander l’accès à tes renseignements, leur correction ou leur suppression en écrivant à la personne responsable.</p>
    </article>
  );
}
