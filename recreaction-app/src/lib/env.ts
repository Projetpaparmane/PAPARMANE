import "server-only";

// Toutes les clés restent côté serveur : rien n'est envoyé au navigateur.
export function supabaseUrl(): string {
  return process.env.SUPABASE_URL ?? "";
}

export function supabasePublishableKey(): string {
  return process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
}

export function supabaseSecretKey(): string {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function stripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY ?? "";
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET ?? "";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}

export function isPaymentConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(supabaseSecretKey() && stripeSecretKey());
}
