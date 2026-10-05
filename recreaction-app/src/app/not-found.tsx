import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container narrow stack">
      <h1 className="h2">Page introuvable</h1>
      <p>Cette page n’existe pas ou n’est plus disponible.</p>
      <Link className="btn btn-dark" href="/">
        Retour à l’accueil
      </Link>
    </div>
  );
}
