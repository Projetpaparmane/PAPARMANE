"use server";

import { redirect } from "next/navigation";
import { countTakenSpots, getEventBySlug, isRegistrationOpen } from "@/lib/data";
import { isPaymentConfigured } from "@/lib/env";
import { getOrigin } from "@/lib/origin";
import { computeTotals } from "@/lib/pricing";
import { type FieldErrors, parseRegistration } from "@/lib/registration";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/clients";

export type RegisterState = {
  message?: string;
  errors?: FieldErrors;
  values?: Record<string, string>;
};

const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  if (!isPaymentConfigured()) {
    return { values, message: "Les inscriptions en ligne ne sont pas encore ouvertes pour cet événement." };
  }

  const parsed = parseRegistration(formData);
  if (!parsed.ok) {
    return { values, errors: parsed.errors, message: "Vérifie les champs indiqués en rouge." };
  }
  const input = parsed.data;

  const event = await getEventBySlug(input.eventSlug);
  if (!event || !event.published) return { values, message: "Cet événement est introuvable." };
  if (!isRegistrationOpen(event)) return { values, message: "Les inscriptions à cet événement sont fermées." };

  const race = event.races.find((r) => r.id === input.raceId);
  if (!race) return { values, errors: { raceId: ["Choisis une distance."] } };

  const admin = createAdminSupabase();
  if (race.capacity && (await countTakenSpots(admin, race.id)) >= race.capacity) {
    return { values, errors: { raceId: [`Le ${race.name} est complet.`] }, message: `Le ${race.name} est complet.` };
  }

  const totals = computeTotals({ priceCents: race.price_cents, feeCents: event.service_fee_cents, taxable: event.taxable });
  const now = new Date().toISOString();

  const { data: registration, error } = await admin
    .from("registrations")
    .insert({
      event_id: event.id,
      race_id: race.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      birth_date: input.birthDate,
      gender: input.gender ?? null,
      phone: input.phone ?? null,
      city: input.city ?? null,
      tshirt_size: input.tshirtSize,
      emergency_contact_name: input.emergencyContactName,
      emergency_contact_phone: input.emergencyContactPhone,
      waiver_accepted_at: now,
      newsletter_opt_in: input.newsletter === "on",
      newsletter_opt_in_at: input.newsletter === "on" ? now : null,
      price_cents: totals.priceCents,
      fee_cents: totals.feeCents,
      gst_cents: totals.gstCents,
      qst_cents: totals.qstCents,
      total_cents: totals.totalCents,
    })
    .select("id")
    .single();

  if (error || !registration) {
    console.error("Inscription non enregistrée", error);
    return { values, message: GENERIC_ERROR };
  }

  let checkoutUrl: string | null = null;
  try {
    const origin = await getOrigin();
    const line = (name: string, cents: number) => ({
      quantity: 1,
      price_data: { currency: "cad", unit_amount: cents, product_data: { name } },
    });
    const lineItems = [
      line(`${event.name} · ${race.name}`, totals.priceCents),
      line("Frais de service", totals.feeCents),
      line("TPS (5 %)", totals.gstCents),
      line("TVQ (9,975 %)", totals.qstCents),
    ].filter((item) => item.price_data.unit_amount > 0);

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      locale: "fr-CA",
      customer_email: input.email,
      client_reference_id: registration.id,
      metadata: { registration_id: registration.id, event_slug: event.slug },
      payment_intent_data: { metadata: { registration_id: registration.id } },
      line_items: lineItems,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/e/${event.slug}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/e/${event.slug}?annule=1`,
    });

    await admin.from("registrations").update({ stripe_session_id: session.id }).eq("id", registration.id);
    checkoutUrl = session.url;
  } catch (e) {
    console.error("Paiement non démarré", e);
    await admin.from("registrations").update({ status: "cancelled" }).eq("id", registration.id);
    return { values, message: "Le paiement n’a pas pu démarrer. Réessaie dans un instant." };
  }

  if (!checkoutUrl) return { values, message: GENERIC_ERROR };
  redirect(checkoutUrl);
}
