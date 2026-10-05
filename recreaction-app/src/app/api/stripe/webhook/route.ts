import type Stripe from "stripe";
import { stripeWebhookSecret } from "@/lib/env";
import { cancelExpiredSession, confirmPaidSession } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

// Stripe appelle cette adresse après chaque paiement. La signature prouve que l'appel vient bien de Stripe.
export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return Response.json({ error: "Webhook non configuré" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return Response.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await confirmPaidSession(event.data.object);
        break;
      case "checkout.session.expired":
        await cancelExpiredSession(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("Webhook Stripe en erreur", event.type, e);
    // Stripe réessaiera plus tard.
    return Response.json({ error: "Traitement impossible" }, { status: 500 });
  }

  return Response.json({ received: true });
}
