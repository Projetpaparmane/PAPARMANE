import { connection } from "next/server";
import ConfigNotice from "@/components/ConfigNotice";
import { isSupabaseConfigured } from "@/lib/env";
import LoginForm from "./LoginForm";

export const metadata = { title: "Connexion" };

type Props = { searchParams: Promise<{ courriel?: string; next?: string; erreur?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  // Rendu à chaque visite : la configuration et les données ne sont pas figées au moment du build.
  await connection();
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { courriel, next, erreur } = await searchParams;

  return (
    <div className="container narrow stack-lg">
      <div className="stack-sm">
        <h1 className="h1">Mon compte</h1>
        <p className="lead">Ton dossard numérique, ta fiche médicale et tes inscriptions, au même endroit.</p>
      </div>
      {erreur ? (
        <p className="notice notice-error" role="alert">
          Ce lien de connexion n’est plus valide. Demande un nouveau lien ci-dessous.
        </p>
      ) : null}
      <div className="card">
        <LoginForm defaultEmail={courriel} next={next} />
      </div>
    </div>
  );
}
