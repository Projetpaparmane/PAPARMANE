#!/usr/bin/env bash
# Lance le serveur MCP Google Search Console (paquet PyPI mcp-search-console,
# https://github.com/AminForou/mcp-gsc). Mode d'emploi : .claude/mcp/README.md
#
# Identifiants du compte de service Google, au choix :
#   GSC_SERVICE_ACCOUNT_JSON  contenu de la clé JSON : brut (entre apostrophes
#                             s'il tient sur plusieurs lignes) ou en base64
#                             (sessions cloud : variable de l'environnement) ;
#   GSC_CREDENTIALS_PATH      chemin absolu vers le fichier JSON (poste local).
#
# Tout message va sur stderr : stdout est réservé au protocole MCP.
set -euo pipefail
shopt -s extglob

# Version figée : ce paquet tiers manipule la clé Google, on ne suit pas
# ses nouvelles versions à l'aveugle.
GSC_MCP_VERSION="0.4.1"

if [[ -n "${GSC_SERVICE_ACCOUNT_JSON:-}" ]]; then
  dir="${XDG_CONFIG_HOME:-$HOME/.config}/mcp-gsc"
  file="$dir/service_account.json"
  umask 077
  mkdir -p "$dir"
  # Apostrophes ou guillemets autour de la valeur : le format .env les retire
  # normalement, mais on ne compte pas dessus.
  value="${GSC_SERVICE_ACCOUNT_JSON##+([[:space:]])}"
  value="${value%%+([[:space:]])}"
  for q in "'" '"'; do
    if [[ ${#value} -ge 2 && "$value" == "$q"*"$q" ]]; then value="${value:1:${#value}-2}"; fi
  done
  if [[ "$value" =~ ^[[:space:]]*\{ ]]; then
    printf '%s' "$value" > "$file"
  elif ! printf '%s' "$value" | tr -d '[:space:]' | base64 --decode > "$file" 2>/dev/null; then
    rm -f "$file"
    echo "search-console : GSC_SERVICE_ACCOUNT_JSON n'est ni du JSON ni du base64 valide." >&2
    exit 1
  fi
  if ! grep -q '"private_key"' "$file" || ! grep -q '"client_email"' "$file"; then
    rm -f "$file"
    echo "search-console : GSC_SERVICE_ACCOUNT_JSON ne ressemble pas à une clé de compte de service Google." >&2
    exit 1
  fi
  export GSC_CREDENTIALS_PATH="$file"
fi

if [[ -z "${GSC_CREDENTIALS_PATH:-}" ]]; then
  echo "search-console : aucun identifiant. Renseigne GSC_SERVICE_ACCOUNT_JSON ou GSC_CREDENTIALS_PATH (voir .claude/mcp/README.md)." >&2
  exit 1
fi

export GSC_SKIP_OAUTH=true
uvx_bin="$(command -v uvx || echo "$HOME/.local/bin/uvx")"
exec "$uvx_bin" "mcp-search-console@${GSC_MCP_VERSION}"
