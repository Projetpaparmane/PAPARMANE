// Veille mensuelle : chaque jour, revérifie les clients suivis dont la dernière
// vérification date de plus de 28 jours et envoie un courriel par client.
// La logique vit dans audit.mjs (runVeille) ; ce fichier ne fait que la
// planifier. Déclenchement manuel : /api/audit?mode=veille&force=1.
import { runVeille } from "./audit.mjs";

export default async () => {
  const result = await runVeille({ budgetMs: 8000 });
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};

export const config = { schedule: "@daily" };
