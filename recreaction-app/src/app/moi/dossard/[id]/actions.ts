"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/clients";

export type MedicalState = { saved?: boolean; error?: string };

const field = z.string().trim().max(500, "500 caractères maximum.");
const schema = z.object({
  registrationId: z.uuid(),
  allergies: field,
  conditions: field,
  medications: field,
  notes: field,
});

export async function saveMedicalCard(_prev: MedicalState, formData: FormData): Promise<MedicalState> {
  const parsed = schema.safeParse({
    registrationId: formData.get("registrationId"),
    allergies: formData.get("allergies") ?? "",
    conditions: formData.get("conditions") ?? "",
    medications: formData.get("medications") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: "Chaque champ accepte 500 caractères au maximum." };

  const { supabase, user } = await getSessionUser();
  if (!user) return { error: "Ta session a expiré. Reconnecte-toi." };

  const { registrationId, ...card } = parsed.data;
  // La base calcule la date de suppression et vérifie que l'inscription t'appartient.
  const { error } = await supabase
    .from("medical_cards")
    .upsert({ registration_id: registrationId, ...card }, { onConflict: "registration_id" });
  if (error) {
    console.error("Fiche médicale non enregistrée", error.message);
    return { error: "La fiche n’a pas pu être enregistrée. Réessaie." };
  }
  revalidatePath(`/moi/dossard/${registrationId}`);
  return { saved: true };
}
