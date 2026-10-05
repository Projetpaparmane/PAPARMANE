// N'accepte que les chemins internes, pour éviter les redirections vers un autre site.
export function safeNextPath(value: string | null | undefined, fallback = "/moi"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
