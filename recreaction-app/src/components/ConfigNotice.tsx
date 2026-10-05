export default function ConfigNotice() {
  return (
    <div className="container narrow stack">
      <h1 className="h2">Configuration à terminer</h1>
      <p className="notice">
        L’app n’est pas encore reliée à sa base de données. Ajoutez les clés Supabase dans les variables
        d’environnement de Netlify (voir le fichier README du dossier <code>recreaction-app</code>), puis redéployez.
      </p>
    </div>
  );
}
