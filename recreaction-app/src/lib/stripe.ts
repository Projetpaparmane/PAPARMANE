import "server-only";
import Stripe from "stripe";
import { stripeSecretKey } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  // STRIPE_API_HOST sert uniquement aux tests locaux, avec un faux serveur Stripe.
  const testHost = process.env.STRIPE_API_HOST;
  client ??= new Stripe(
    stripeSecretKey(),
    testHost ? { host: testHost, port: Number(process.env.STRIPE_API_PORT ?? 80), protocol: "http" } : undefined,
  );
  return client;
}
