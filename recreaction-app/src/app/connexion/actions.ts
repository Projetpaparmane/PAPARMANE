"use server";

import { z } from "zod";
import { getOrigin } from "@/lib/origin";
import { safeNextPath } from "@/lib/paths";
import { createSessionSupabase } from "@/lib/supabase/clients";

export type LoginState = { sentTo?: string; error?: string; email?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = String(formData.get("email") ?? "").trim();
  const parsed = z.email().safeParse(raw);
  if (!parsed.success) return { email: raw, error: "Indique un courriel valide." };

  const email = parsed.data.toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const origin = await getOrigin();
  const supabase = await createSessionSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });
  if (error) {
    console.error("Lien de connexion non envoyé", error.message);
    return { email, error: "Le courriel n’a pas pu partir. Réessaie dans une minute." };
  }
  return { sentTo: email };
}
