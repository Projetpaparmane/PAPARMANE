import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "@/lib/env";

// Pages publiques : aucune session, seulement ce que les règles d'accès permettent aux visiteurs.
export function createPublicSupabase() {
  return createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Pages du compte : la session du participant ou de l'organisateur, lue dans les témoins (cookies).
export async function createSessionSupabase() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un composant serveur : le proxy se charge déjà de rafraîchir la session.
        }
      },
    },
  });
}

// Serveur seulement : contourne les règles d'accès. Réservé à l'inscription et au webhook de paiement.
export function createAdminSupabase() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getSessionUser() {
  const supabase = await createSessionSupabase();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
