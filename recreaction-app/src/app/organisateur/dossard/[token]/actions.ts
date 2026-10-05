"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/clients";

export async function markPickedUp(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!/^[a-f0-9]{32}$/.test(token)) return;
  const { supabase, user } = await getSessionUser();
  if (!user) return;
  // Les règles d'accès n'autorisent cette mise à jour qu'à l'organisation de l'événement.
  const { error } = await supabase
    .from("registrations")
    .update({ picked_up_at: new Date().toISOString() })
    .eq("qr_token", token)
    .eq("status", "paid")
    .is("picked_up_at", null);
  if (error) console.error("Remise du dossard non enregistrée", error.message);
  revalidatePath(`/organisateur/dossard/${token}`);
}
