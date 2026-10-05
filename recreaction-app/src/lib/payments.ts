import "server-only";
import type Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/clients";

// Confirme l'inscription liée à une session Stripe payée et retourne le numéro de dossard.
// Sans effet si elle est déjà confirmée : le webhook et la page de remerciement peuvent l'appeler tous les deux.
export async function confirmPaidSession(session: Stripe.Checkout.Session): Promise<number | null> {
  const registrationId = session.metadata?.registration_id ?? session.client_reference_id;
  if (!registrationId || session.payment_status !== "paid") return null;

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const { data, error } = await createAdminSupabase().rpc("confirm_registration", {
    p_registration_id: registrationId,
    p_session_id: session.id,
    p_payment_intent: paymentIntent,
  });
  if (error) throw error;
  return typeof data === "number" ? data : null;
}

export async function cancelExpiredSession(session: Stripe.Checkout.Session): Promise<void> {
  const registrationId = session.metadata?.registration_id ?? session.client_reference_id;
  if (!registrationId) return;
  const { error } = await createAdminSupabase()
    .from("registrations")
    .update({ status: "cancelled" })
    .eq("id", registrationId)
    .eq("status", "pending");
  if (error) throw error;
}
